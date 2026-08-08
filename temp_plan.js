const assistantEngine = require('./src/crm/services/assistant-engine.service');
const { buildExecutionPlan } = require('./src/crm/services/assistant/planner.service');
const { optimizeExecutionPlan } = require('./src/crm/services/assistant/query-optimizer.service');

const question = 'Compare leads and deals created this month';
const plan = optimizeExecutionPlan(buildExecutionPlan(question));
console.log('COMPARE PLAN:', JSON.stringify(plan, null, 2));

const context = {
  modules: ['deals'],
  lastQuestion: 'Show deals',
  datasets: [{ module: 'deals', period: null, requestFingerprint: 'Show deals', result: { data: [{ id: 'deal-1' }], info: { count: 1, more_records: false } } }],
};
const question2 = 'Compare with last month';
const plan2 = optimizeExecutionPlan(buildExecutionPlan(question2, context));
console.log('FOLLOW-UP PLAN:', JSON.stringify(plan2, null, 2));
