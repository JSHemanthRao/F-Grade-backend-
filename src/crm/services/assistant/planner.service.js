const { DEBUG_ASSISTANT } = require('../../../common/config/env');
const { detectIntents } = require('./intent-detector.service');
const { detectModules, normalizeQuestion, tokenizeQuestion } = require('./module-detector.service');
const { detectTimeRange } = require('./time-detector.service');

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

function buildExecutionPlan(question) {
  const intents = detectIntents(question);
  const normalizedQuestion = normalizeQuestion(question);
  const tokens = tokenizeQuestion(question);
  const modules = detectModules(question);
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
  };

  if (DEBUG_ASSISTANT) {
    console.info('[CRM Assistant][Execution Planner]', {
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
  } else if (intents.includes('COUNT')) {
    plan.steps.push({ type: 'count', module: modules[0] });
  }

  if (!intents.includes('CONVERSION') && intents.includes('COMPARE')) {
    plan.steps.push({ type: 'compare', module: modules[0], timeRange });
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
