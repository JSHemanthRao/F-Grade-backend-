const { buildExecutionPlan } = require('./src/crm/services/assistant/planner.service');
const { optimizeExecutionPlan } = require('./src/crm/services/assistant/query-optimizer.service');

const context = {
  modules: ['deals'],
  lastQuestion: 'Show deals',
  datasets: [{ module: 'deals', period: null, requestFingerprint: 'Show deals', result: { data: [{ id: 'deal-1' }], info: { count: 1, more_records: false } } }],
};
const plan = optimizeExecutionPlan(buildExecutionPlan('Compare with last month', context));
console.log(JSON.stringify(plan, null, 2));
