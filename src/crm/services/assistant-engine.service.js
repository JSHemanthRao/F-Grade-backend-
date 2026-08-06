const { DEBUG_ASSISTANT } = require('../../common/config/env');
const recordsService = require('../services/records.service');
const { buildExecutionPlan } = require('./assistant/planner.service');
const { calculateResult } = require('./assistant/calculator.service');
const { formatResponse } = require('./assistant/formatter.service');
const { detectModule } = require('./assistant/module-detector.service');
const { discoverLeadConversionFields } = require('../services/conversion-discovery.service');
const { FALLBACK_REASONS, logFallbackReason } = require('./assistant/fallback-engine.service');

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

  const plan = buildExecutionPlan(question);
  const datasets = [];

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
    const moduleKey = step.module || moduleCandidates[0];
    const periods = step.type === 'compare' || (step.type === 'conversion_count' && plan.intents.includes('COMPARE'))
      ? ['this month', 'last month']
      : [null];

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
        retrieval_mode: step.type === 'count' ? 'count' : (['aggregate', 'analytics', 'compare', 'conversion_count'].includes(step.type) ? 'all' : (step.type === 'query' && step.explicit ? 'page' : 'auto')),
      };

      if (DEBUG_ASSISTANT) {
        console.info('[CRM Assistant][CRM Call] ↓', { step, module: moduleKey, period, options: requestOptions });
      }

      const result = step.type === 'count'
        ? await recordsService.getCount(moduleKey, requestOptions)
        : await recordsService.getRecords(moduleKey, requestOptions);

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
      message: 'I could not retrieve the requested CRM data. Please clarify the records or date range you need and try again.',
      requestedInformation: question,
    };
  }

  const calculations = calculateResult(plan, datasets);
  if (plan.steps.some((step) => step.type === 'conversion_count')
    && calculations.some((calculation) => calculation.type === 'conversion_unavailable')) {
    logFallbackReason(FALLBACK_REASONS.UNSUPPORTED_METRIC);
    const fallback = await getConversionFallback(question, plan);
    return formatResponse(plan, datasets, [], fallback ? { conversionFallback: fallback } : { emptyReason: 'UNSUPPORTED_METRIC' });
  }
  return formatResponse(plan, datasets, calculations);
}

module.exports = {
  handleAssistantRequest,
  detectModule,
};
