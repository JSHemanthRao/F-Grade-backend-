const { DEBUG_ASSISTANT } = require('../../common/config/env');
const recordsService = require('../services/records.service');
const { buildExecutionPlan } = require('./assistant/planner.service');
const { calculateResult } = require('./assistant/calculator.service');
const { formatResponse } = require('./assistant/formatter.service');
const { detectModule } = require('./assistant/module-detector.service');
const { discoverLeadConversionFields } = require('../services/conversion-discovery.service');
const { FALLBACK_REASONS, logFallbackReason } = require('./assistant/fallback-engine.service');
const { optimizeExecutionPlan } = require('./assistant/query-optimizer.service');
const { validateExecution } = require('./assistant/validation.service');
const { generateInsights } = require('./assistant/insight.service');

async function getConversionFallback(question, plan) {
  const period = plan.timeRange.label === 'all time' ? 'the requested period' : plan.timeRange.label;
  const fallbackQueries = [
    ['leads', `How many leads were created ${period}?`],
    ['deals', `How many deals were created ${period}?`],
  ];
  const results = await Promise.all(fallbackQueries.map(async ([module, fallbackQuestion]) => {
    try {
      console.info('[CRM Assistant][Conversion] Fallback CRM call', { module, question: fallbackQuestion });
      const result = await recordsService.getCount(module, { question: fallbackQuestion, retrieval_mode: 'count' });
      return { module, count: Number(result?.info?.count ?? 0), available: true };
    } catch (error) {
      console.warn('[CRM Assistant][Conversion] Fallback failed', { module, reason: error?.response?.data?.code || error?.message });
      return { module, count: null, available: false };
    }
  }));
  const leads = results.find((result) => result.module === 'leads');
  const deals = results.find((result) => result.module === 'deals');
  if (leads?.available && deals?.available) {
    return { period, leadCount: leads.count, dealCount: deals.count };
  }
  return null;
}

async function handleAssistantRequest(payload = {}) {
  const question = String(payload?.question || '').trim();

  if (!question) {
    return {
      success: false,
      message: 'A question is required.',
    };
  }

  const context = payload?.context || payload?.conversationContext || {};
  const plan = optimizeExecutionPlan(buildExecutionPlan(question, context));
  const datasets = [];
  const requestCache = new Map();
  const contextDatasets = Array.isArray(context.datasets) ? context.datasets : [];

  if (DEBUG_ASSISTANT) {
    console.info('[CRM Assistant][Planner Steps] ↓', plan.steps);
    console.info('[CRM Assistant][Assistant Engine]', {
      question,
      normalizedQuestion: plan.normalizedQuestion,
      detectedIntent: plan.intents,
      detectedModules: plan.modules,
      detectedTimePeriod: plan.timeRange,
      executionPlan: plan.steps,
    });
  }

  const inferredModule = detectModule(question);
  const moduleCandidates = plan.modules.length > 0 ? plan.modules : inferredModule ? [inferredModule] : [];

  if (!moduleCandidates.length) {
    return {
      success: false,
      message: 'I could not identify the CRM information needed to answer that question.',
    };
  }

  let conversionDiscovery = null;
  if (plan.intents.includes('CONVERSION')) {
    console.info('[CRM Assistant][Conversion] Intent and modules', {
      intent: 'CONVERSION',
      modules: { source: 'leads', target: 'deals' },
    });
    conversionDiscovery = await discoverLeadConversionFields();
    console.info('[CRM Assistant][Conversion] Fields inspected', {
      source: conversionDiscovery.source,
      fields: conversionDiscovery.fields,
      metadataAvailable: conversionDiscovery.metadataAvailable,
    });
    const needsDealLink = /converted\s+(?:into|to)\s+deals?|became\s+a\s+deal/i.test(question);
    if (!conversionDiscovery.fields.length) {
      logFallbackReason(FALLBACK_REASONS.UNSUPPORTED_METRIC);
      const fallback = await getConversionFallback(question, plan);
      return formatResponse(plan, [], [], { conversionFallback: fallback });
    }
    const needsConversionDate = plan.timeRange.range !== 'all_time';
    const hasConversionDate = conversionDiscovery.fields.some((field) => /converted.*(?:date|time)|conversion.*(?:date|time)/i.test(field));
    if (needsConversionDate && !hasConversionDate) {
      logFallbackReason(FALLBACK_REASONS.INSUFFICIENT_DATA);
      const fallback = await getConversionFallback(question, plan);
      return formatResponse(plan, [], [], { conversionFallback: fallback });
    }
    if (needsDealLink && !conversionDiscovery.fields.includes('Converted_Deal')) {
      logFallbackReason(FALLBACK_REASONS.UNSUPPORTED_METRIC);
      const fallback = await getConversionFallback(question, plan);
      return formatResponse(plan, [], [], { conversionFallback: fallback });
    }
  }

  try {
    for (const step of plan.steps) {
    const stepModules = Array.isArray(step.modules) && step.modules.length > 0
      ? step.modules
      : [step.module || moduleCandidates[0]];
    const explicitPeriodComparison = /\bthis month\b[\s\S]*\blast month\b|\blast month\b[\s\S]*\bthis month\b/i.test(question)
      || (contextDatasets.length > 0 && /\blast month\b/i.test(question) && step.type === 'compare');
    const periods = ((step.type === 'compare' && explicitPeriodComparison)
      || (step.type === 'conversion_count' && plan.intents.includes('COMPARE')))
      ? ['this month', 'last month']
      : [null];

    for (const moduleKey of stepModules) {
    for (const period of periods) {
      const stepQuestion = period
        ? ` ${question.replace(/\b(this month|last month)\b/gi, '')} ${period}`
        : question;
      const requestOptions = {
        question,
        ...(period ? { request_text: stepQuestion } : {}),
        ...(step.type === 'query' && step.explicit ? {
          page: step.page,
          ...(step.per_page ? { per_page: step.per_page } : {}),
          offset: step.offset,
        } : {}),
        ...(conversionDiscovery ? { conversion_fields: conversionDiscovery.fields, conversion_metric: step.metric } : {}),
        ...(step.requiredFieldsByModule?.[moduleKey]?.length ? { fields: step.requiredFieldsByModule[moduleKey] } : {}),
        retrieval_mode: step.type === 'count' ? 'count' : (['aggregate', 'analytics', 'compare', 'conversion_count'].includes(step.type) ? 'all' : (step.type === 'query' && step.explicit ? 'page' : 'auto')),
      };

      const cacheKey = JSON.stringify({ moduleKey, period, type: step.type, options: requestOptions });
      const contextual = contextDatasets.find((dataset) => dataset.cacheKey === cacheKey
        || (dataset.module === moduleKey
          && (dataset.period === period || (period === 'this month' && dataset.period == null))
          && dataset.requestFingerprint === context.lastQuestion));
      const cached = requestCache.get(cacheKey) || contextual?.result;
      if (cached) {
        datasets.push({ step, period, module: moduleKey, result: cached, reused: true });
        continue;
      }

      if (DEBUG_ASSISTANT) {
        console.info('[CRM Assistant][CRM Call] ↓', { step, module: moduleKey, period, options: requestOptions });
      }

      const execute = async (options) => (step.type === 'count'
        ? recordsService.getCount(moduleKey, options)
        : recordsService.getRecords(moduleKey, options));
      let result;
      try {
        result = await execute(requestOptions);
      } catch (firstError) {
        console.warn('[CRM Assistant] Retrying CRM task', { module: moduleKey, task: step.type });
        result = await execute({
          ...requestOptions,
          force_coql: true,
          retrieval_mode: step.explicit ? requestOptions.retrieval_mode : (step.type === 'count' ? 'count' : 'all'),
        });
      }
      if (result?.info?.more_records === true && !step.explicit) {
        result = await execute({ ...requestOptions, retrieval_mode: 'all', force_coql: true });
      }
      requestCache.set(cacheKey, result);

      datasets.push({ step, period, module: moduleKey, result });

      if (DEBUG_ASSISTANT) {
        console.info('[CRM Assistant][Records Returned] ↓', {
          step,
          period,
          module: moduleKey,
          count: result?.info?.count ?? result?.data?.length ?? 0,
          records: result?.data?.length ?? 0,
        });
      }
    }
    }
    }
  } catch (error) {
    console.error('[CRM Assistant] CRM retrieval failed', {
      module: moduleCandidates[0],
      reason: error?.response?.data?.code || error?.code || error?.message,
    });
    if (plan.steps.some((step) => step.type === 'conversion_count')) {
      logFallbackReason(FALLBACK_REASONS.INVALID_QUERY);
      const fallback = await getConversionFallback(question, plan);
      return formatResponse(plan, [], [], { conversionFallback: fallback });
    }
    return {
      success: false,
      message: 'The CRM could not provide the requested information at this time.',
      requestedInformation: question,
    };
  }

  let calculations = calculateResult(plan, datasets);
  let validation = validateExecution({ plan, question, datasets, calculations });
  if (!validation.valid) {
    console.warn('[CRM Assistant] Execution validation failed', { issues: validation.issues });
    const incomplete = datasets.filter((dataset) => dataset?.result?.info?.more_records === true && !dataset.step?.explicit);
    for (const dataset of incomplete) {
      const retryOptions = { question, fields: dataset.step.requiredFieldsByModule?.[dataset.module], retrieval_mode: 'all', force_coql: true };
      const retryResult = dataset.step.type === 'count'
        ? await recordsService.getCount(dataset.module, retryOptions)
        : await recordsService.getRecords(dataset.module, retryOptions);
      dataset.result = retryResult;
    }
    calculations = calculateResult(plan, datasets);
    validation = validateExecution({ plan, question, datasets, calculations });
  }
  if (!validation.valid) {
    return formatResponse(plan, datasets, [], {
      emptyReason: FALLBACK_REASONS.INVALID_QUERY,
      closestAnswer: 'The CRM returned partial information, so no unsupported conclusion was generated.',
      limitation: 'The CRM could not complete every required retrieval, so the result is not presented as a complete business answer.',
    });
  }
  if (plan.steps.some((step) => step.type === 'conversion_count')
    && calculations.some((calculation) => calculation.type === 'conversion_unavailable')) {
    logFallbackReason(FALLBACK_REASONS.UNSUPPORTED_METRIC);
    const fallback = await getConversionFallback(question, plan);
    return formatResponse(plan, datasets, [], fallback ? { conversionFallback: fallback } : { emptyReason: 'UNSUPPORTED_METRIC' });
  }
  return formatResponse(plan, datasets, calculations, { insights: generateInsights(plan, datasets, calculations) });
}

module.exports = {
  handleAssistantRequest,
  detectModule,
};
