const { DEBUG_ASSISTANT } = require('../../../common/config/env');
const { detectIntents } = require('./intent-detector.service');
const { detectModules, normalizeQuestion, tokenizeQuestion } = require('./module-detector.service');
const { detectTimeRange } = require('./time-detector.service');
const logger = require('../../../common/logging/logger');

function detectPagination(question, module) {
  const text = String(question || '').trim().toLowerCase();
  const pageMatch = text.match(/\bpage\s+(\d{1,6})(?:\s+(?:with|at)\s+(\d{1,3})\s+records?)?/i);
  const directionMatch = text.match(/\b(first|next|previous|last)\s+(\d{1,3})\b/i);
  const showMatch = text.match(/\bshow\s+(\d{1,3})\b/i);
  const requestedCount = pageMatch?.[2]
    ? Number(pageMatch[2])
    : directionMatch?.[2]
      ? Number(directionMatch[2])
      : showMatch?.[1]
        ? Number(showMatch[1])
        : null;
  const direction = pageMatch
    ? 'page'
    : directionMatch?.[1]?.toLowerCase() || (showMatch ? 'first' : 'first');
  const page = pageMatch
    ? Number(pageMatch[1])
    : direction === 'next'
      ? 2
      : 1;

  return {
    action: 'query',
    module: module || null,
    page,
    per_page: requestedCount || null,
    offset: requestedCount ? (page - 1) * requestedCount : 0,
    direction,
    explicit: Boolean(pageMatch || directionMatch || showMatch),
  };
}

function buildExecutionPlan(question, context = {}) {
  const intents = detectIntents(question);
  const normalizedQuestion = normalizeQuestion(question);
  const tokens = tokenizeQuestion(question);
  const detectedModules = detectModules(question);
  const isPerformanceReport = /complete\s+crm\s+performance\s+report|crm\s+performance\s+report|performance\s+report/i.test(question);
  const modules = isPerformanceReport
    ? ['leads', 'contacts', 'accounts', 'deals']
    : detectedModules.length > 0
    ? detectedModules
    : (Array.isArray(context.modules) ? context.modules.filter(Boolean) : []);
  const timeRange = detectTimeRange(question);
  const pagination = detectPagination(question, modules[0]);

  const plan = {
    question,
    normalizedQuestion,
    tokens,
    intents,
    modules,
    timeRange,
    pagination,
    steps: [],
    report: isPerformanceReport,
  };

  if (DEBUG_ASSISTANT) {
    logger.info('Planner Engine', {
      originalQuestion: question,
      normalizedQuestion,
      tokens,
      detectedIntent: intents,
      detectedModule: modules,
      detectedTimePeriod: timeRange,
      pagination,
      executionPlan: plan,
    });
  }

  if (isPerformanceReport) {
    modules.filter((module) => module !== 'deals').forEach((module) => plan.steps.push({ type: 'query', module, timeRange }));
    plan.steps.push({ type: 'analytics', module: 'deals', timeRange, reportTasks: ['pipeline', 'closed_won', 'closed_lost', 'stage_distribution', 'top_customers', 'top_reps'] });
    return plan;
  }

  if (intents.includes('CONVERSION')) {
    const sourceModule = modules.includes('leads') ? 'leads' : modules[0];
    const targetModule = modules.includes('deals') ? 'deals' : 'deals';
    plan.steps.push({
      type: 'conversion_count',
      sourceModule,
      targetModule,
      module: sourceModule,
      timeRange: timeRange.range,
      metric: /conversion\s+rate|rate/i.test(question) ? 'rate' : 'count',
    });
  } else if (intents.includes('COUNT') && !(intents.includes('AGGREGATION') && /sum|average|avg|value|revenue|amount|median|percentage|growth|rate/i.test(question))) {
    modules.forEach((module) => plan.steps.push({ type: 'count', module }));
  }

  if (!intents.includes('CONVERSION') && intents.includes('COMPARE')) {
    plan.steps.push({ type: 'compare', module: modules[0], modules, timeRange });
  }

  if (!intents.includes('CONVERSION') && !intents.includes('COMPARE') && intents.includes('AGGREGATION') && /sum|average|avg|value|revenue|amount|median|percentage|growth|rate/i.test(question)) {
    plan.steps.push({ type: 'aggregate', module: modules[0], timeRange });
  }

  if (!intents.includes('CONVERSION') && intents.includes('ANALYTICS')) {
    plan.steps.push({ type: 'analytics', module: modules[0], timeRange });
  }

  if (intents.includes('LIST') && plan.steps.length === 0) {
    plan.steps.push({ type: 'query', module: modules[0], timeRange, ...pagination });
  }

  if (plan.steps.length === 0) {
    plan.steps.push({ type: 'query', module: modules[0], timeRange, ...pagination });
  }

  return plan;
}

module.exports = {
  buildExecutionPlan,
  detectPagination,
};
