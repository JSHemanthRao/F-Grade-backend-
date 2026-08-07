const { DEBUG_ASSISTANT } = require('../../common/config/env');
const recordsService = require('../services/records.service');
const { buildExecutionPlan } = require('./assistant/planner.service');
const { optimizeExecutionPlan } = require('./assistant/query-optimizer.service');
const { executePlan } = require('./assistant/execution-engine.service');
const { mergeDatasets } = require('./assistant/merge-engine.service');
const { calculateResult } = require('./assistant/calculator.service');
const { validateExecution } = require('./assistant/validation.service');
const { generateInsights } = require('./assistant/insight.service');
const { formatResponse } = require('./assistant/formatter.service');
const { detectModule } = require('./assistant/module-detector.service');
const { discoverLeadConversionFields } = require('../services/conversion-discovery.service');
const { FALLBACK_REASONS, logFallbackReason } = require('./assistant/fallback-engine.service');
const logger = require('../../common/logging/logger');

async function getConversionFallback(question, plan) {
  const period = plan.timeRange.label === 'all time' ? 'the requested period' : plan.timeRange.label;
  const results = await Promise.all(['leads', 'deals'].map(async (module) => {
    try {
      const result = await recordsService.getCount(module, { question: `How many ${module} were created ${period}?`, retrieval_mode: 'count' });
      return { module, count: Number(result?.info?.count ?? 0), available: true };
    } catch (error) {
      logger.warn('Fallback', { module, message: 'CRM alternative unavailable' });
      return { module, count: null, available: false };
    }
  }));
  const leads = results.find((result) => result.module === 'leads');
  const deals = results.find((result) => result.module === 'deals');
  return leads?.available && deals?.available ? { period, leadCount: leads.count, dealCount: deals.count } : null;
}

async function handleAssistantRequest(payload = {}) {
  const question = String(payload?.question || '').trim();
  if (!question) return { success: false, message: 'A question is required.' };

  const context = payload?.context || payload?.conversationContext || {};
  const plan = optimizeExecutionPlan(buildExecutionPlan(question, context));
  const moduleCandidates = plan.modules.length > 0 ? plan.modules : (detectModule(question) ? [detectModule(question)] : []);
  if (!moduleCandidates.length) return { success: false, message: 'I could not identify the CRM information needed to answer that question.' };

  if (DEBUG_ASSISTANT) logger.info('Assistant Pipeline', { tasks: plan.steps.length, modules: plan.modules });

  let conversionDiscovery = null;
  if (plan.intents.includes('CONVERSION')) {
    conversionDiscovery = await discoverLeadConversionFields();
    const needsDate = plan.timeRange.range !== 'all_time';
    const hasDate = conversionDiscovery.fields.some((field) => /converted.*(?:date|time)|conversion.*(?:date|time)/i.test(field));
    const needsDealLink = /converted\s+(?:into|to)\s+deals?|became\s+a\s+deal/i.test(question);
    if (!conversionDiscovery.fields.length || (needsDate && !hasDate) || (needsDealLink && !conversionDiscovery.fields.includes('Converted_Deal'))) {
      logFallbackReason(FALLBACK_REASONS.UNSUPPORTED_METRIC);
      return formatResponse(plan, [], [], { conversionFallback: await getConversionFallback(question, plan) });
    }
  }

  let datasets;
  try {
    datasets = await executePlan({ plan, question, moduleCandidates, context, conversionDiscovery });
  } catch (error) {
    logger.error('Assistant Pipeline', { module: moduleCandidates[0], message: 'Execution failed' });
    if (plan.steps.some((step) => step.type === 'conversion_count')) {
      return formatResponse(plan, [], [], { conversionFallback: await getConversionFallback(question, plan) });
    }
    return { success: false, message: 'The CRM could not provide the requested information at this time.', requestedInformation: question };
  }

  let merged = mergeDatasets(datasets);
  let calculations = calculateResult(plan, merged.datasets);
  let validation = validateExecution({ plan, question, datasets: merged.datasets, calculations });
  if (!validation.valid && validation.issues.includes('dataset_incomplete')) {
    for (const dataset of merged.datasets.filter((item) => item.result?.info?.more_records === true && !item.step?.explicit)) {
      const options = { question, fields: dataset.step.requiredFieldsByModule?.[dataset.module], retrieval_mode: 'all', force_coql: true };
      dataset.result = dataset.step.type === 'count'
        ? await recordsService.getCount(dataset.module, options)
        : await recordsService.getRecords(dataset.module, options);
    }
    merged = mergeDatasets(merged.datasets);
    calculations = calculateResult(plan, merged.datasets);
    validation = validateExecution({ plan, question, datasets: merged.datasets, calculations });
  }
  if (!validation.valid) {
    return formatResponse(plan, merged.datasets, [], {
      closestAnswer: 'The CRM did not provide enough data to complete this analysis.',
      limitation: 'The requested analysis could not be completed from the available CRM data.',
    });
  }

  if (plan.steps.some((step) => step.type === 'conversion_count') && calculations.some((item) => item.type === 'conversion_unavailable')) {
    const fallback = await getConversionFallback(question, plan);
    return formatResponse(plan, merged.datasets, [], fallback ? { conversionFallback: fallback } : { emptyReason: 'UNSUPPORTED_METRIC' });
  }
  return formatResponse(plan, merged.datasets, calculations, { insights: generateInsights(plan, merged.datasets, calculations) });
}

module.exports = { handleAssistantRequest, detectModule };
