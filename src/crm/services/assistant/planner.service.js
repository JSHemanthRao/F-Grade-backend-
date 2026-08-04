const { detectIntents } = require('./intent-detector.service');
const { detectModules } = require('./module-detector.service');
const { detectTimeRange } = require('./time-detector.service');

function buildExecutionPlan(question) {
  const intents = detectIntents(question);
  const modules = detectModules(question);
  const timeRange = detectTimeRange(question);

  const plan = {
    question,
    intents,
    modules,
    timeRange,
    steps: [],
  };

  if (intents.includes('COUNT')) {
    plan.steps.push({ type: 'count', module: modules[0] });
  }

  if (intents.includes('COMPARE')) {
    plan.steps.push({ type: 'compare', module: modules[0], timeRange });
  }

  if (intents.includes('AGGREGATION') || intents.includes('ANALYTICS')) {
    plan.steps.push({ type: 'aggregate', module: modules[0], timeRange });
  }

  if (plan.steps.length === 0) {
    plan.steps.push({ type: 'query', module: modules[0], timeRange });
  }

  return plan;
}

module.exports = {
  buildExecutionPlan,
};
