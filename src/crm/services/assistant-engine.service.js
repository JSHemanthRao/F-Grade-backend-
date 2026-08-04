const recordsService = require('../services/records.service');
const { buildExecutionPlan } = require('./assistant/planner.service');
const { calculateResult } = require('./assistant/calculator.service');
const { formatResponse } = require('./assistant/formatter.service');

async function handleAssistantRequest(payload = {}) {
  const question = String(payload?.question || '').trim();
  const plan = buildExecutionPlan(question);
  const datasets = [];

  for (const step of plan.steps) {
    if (step.type === 'count') {
      const result = await recordsService.getCount(step.module, {
        question,
        retrieval_mode: 'count',
      });
      datasets.push(result);
    } else {
      const result = await recordsService.getRecords(step.module, {
        question,
        retrieval_mode: step.type === 'query' ? 'auto' : 'auto',
      });
      datasets.push(result);
    }
  }

  const calculations = calculateResult(plan, datasets);
  return formatResponse(plan, datasets, calculations);
}

module.exports = {
  handleAssistantRequest,
};
