const { DEBUG_ASSISTANT } = require('../../../common/config/env');
const recordsService = require('../records.service');

function getPeriods(step, question, contextDatasets) {
  const explicitPeriodComparison = /\bthis month\b[\s\S]*\blast month\b|\blast month\b[\s\S]*\bthis month\b/i.test(question)
    || (contextDatasets.length > 0 && /\blast month\b/i.test(question) && step.type === 'compare');
  return ((step.type === 'compare' && explicitPeriodComparison)
    || (step.type === 'conversion_count' && step.intents?.includes('COMPARE')))
    ? ['this month', 'last month']
    : [null];
}

async function executePlan({ plan, question, moduleCandidates, context = {}, conversionDiscovery = null }) {
  const datasets = [];
  const requestCache = new Map();
  const contextDatasets = Array.isArray(context.datasets) ? context.datasets : [];

  for (const step of plan.steps) {
    const stepModules = Array.isArray(step.modules) && step.modules.length > 0
      ? step.modules
      : [step.module || moduleCandidates[0]];
    const periods = getPeriods({ ...step, intents: plan.intents }, question, contextDatasets);

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

        if (DEBUG_ASSISTANT) console.info('[CRM Assistant][Execution Task]', { module: moduleKey, period, type: step.type });
        const execute = (options) => step.type === 'count'
          ? recordsService.getCount(moduleKey, options)
          : recordsService.getRecords(moduleKey, options);
        let result;
        try {
          result = await execute(requestOptions);
        } catch (error) {
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
      }
    }
  }

  return datasets;
}

module.exports = { executePlan };
