const { calculateResult } = require('./src/crm/services/assistant/calculator.service');
const { validateExecution } = require('./src/crm/services/assistant/validation.service');

const plan = { steps: [{ type: 'analytics' }], modules: ['deals'], intents: ['ANALYTICS'], question: 'Top 5 deal owners', filterPlans: { deals: { valid: true } } };
const datasets = [{
  module: 'deals',
  result: {
    data: [
      { id: 'deal-1', Amount: 1000, Stage: 'Closed Won', Owner: { name: 'Alice' } },
      { id: 'deal-2', Amount: 500, Stage: 'Closed Won', Owner: { name: 'Bob' } },
      { id: 'deal-3', Amount: 250, Stage: 'Closed Won', Owner: { name: 'Alice' } },
    ],
    info: { retrievalComplete: true },
  },
  step: { explicit: true },
}];

const result = calculateResult(plan, datasets);
console.log('Calculated types:', result.calculations.map((c) => c.type));
const validation = validateExecution({ plan, question: plan.question, datasets, calculations: result.calculations, limitations: result.limitations });
console.log('Validation issues:', validation.issues);
console.log('Validation warnings:', validation.warnings);
console.log('Removed metrics:', validation.removedMetrics);
console.log('Sanitized types:', validation.calculations.map((c) => c.type));
console.log('Sanitized calculations:', JSON.stringify(validation.calculations, null, 2));
