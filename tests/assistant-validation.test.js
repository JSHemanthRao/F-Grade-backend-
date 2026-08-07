const test = require('node:test');
const assert = require('node:assert/strict');
const { validateExecution, validateResponse } = require('../src/crm/services/assistant/validation.service');

const plan = {
  steps: [{ type: 'analytics' }],
  modules: ['deals'],
  intents: ['ANALYTICS'],
  question: 'What is the pipeline?',
  filterPlans: { deals: { valid: true } },
};

const datasets = [{
  module: 'deals',
  result: {
    data: [
      { id: '1', Stage: 'Negotiation', Amount: 100 },
      { id: '2', Stage: 'Closed Won', Amount: 200 },
    ],
    info: { retrievalComplete: true },
  },
  step: { explicit: true },
}];

const calculations = [
  { type: 'pipeline_value', label: 'Pipeline value', value: 100 },
  { type: 'unsupported_metric', label: 'Unsupported', value: 999 },
];

const limitations = [];

test('validateExecution removes unsupported calculations and adds limitations', () => {
  const result = validateExecution({ plan, question: plan.question, datasets, calculations, limitations });
  assert.equal(result.invalid, undefined);
  assert.ok(result.warnings.length > 0);
  assert.ok(result.issues.includes('unsupported_calculation') || result.removedMetrics.includes('unsupported_metric'));
  assert.equal(result.calculations.length, 1);
  assert.equal(result.calculations[0].type, 'pipeline_value');
});

test('validateResponse rejects missing key sections and banned language', () => {
  const response = {
    summary: 'Approximately 100 deals.',
    requestedInformation: plan.question,
    keyMetrics: [{ type: 'pipeline_value', label: 'Pipeline value', value: '₹100' }],
    suggestedNextAnalysis: ['Show next week deal value.'],
    businessObservations: [{ type: 'increase', message: 'Approximately strong momentum in the funnel.' }],
    limitations: [],
  };

  const validation = validateResponse({ response, plan, datasets, calculations, limitations });
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.includes('language_rules_violation'));
});
