const test = require('node:test');
const assert = require('node:assert/strict');
const { formatResponse } = require('../src/crm/services/assistant/formatter.service');
const { chooseFallback, FALLBACK_REASONS } = require('../src/crm/services/assistant/fallback-engine.service');

const plan = { question: 'CRM metric', modules: ['leads'], steps: [] };

test('fallback returns the exact CRM-backed answer when records exist', () => {
  const response = formatResponse(plan, [{ result: { data: [{ id: '1' }] } }], []);
  assert.equal(response.summary, '1 CRM records returned.');
});

test('fallback distinguishes an empty matching result', () => {
  const response = formatResponse(plan, [{ result: { data: [] } }], []);
  assert.equal(response.summary, 'No matching CRM records were found for the requested period.');
});

test('fallback gives a business explanation for unsupported metrics', () => {
  const response = formatResponse(plan, [], [], { emptyReason: 'UNSUPPORTED_METRIC' });
  assert.equal(response.summary, "I couldn't calculate this metric because the connected CRM doesn't provide the required information.");
  assert.equal(JSON.stringify(response).includes('UNSUPPORTED_METRIC'), false);
});

test('fallback returns the closest supported business metrics', () => {
  const response = formatResponse(plan, [], [], {
    conversionFallback: { period: 'last month', leadCount: 120, dealCount: 84 },
  });
  assert.equal(response.summary, "I can't calculate lead conversions because the connected CRM doesn't expose that relationship. However, last month there were 120 new leads and 84 new deals.");
  assert.equal(JSON.stringify(response).includes('Converted_Date_Time'), false);
});

test('fallback engine keeps the required priority order', () => {
  assert.deepEqual(chooseFallback({
    exactAnswer: 'exact',
    closestAnswer: 'closest',
    clarifyingQuestion: 'clarify',
    reason: FALLBACK_REASONS.INVALID_QUERY,
  }), { type: 'EXACT', answer: 'exact' });
  assert.deepEqual(chooseFallback({ closestAnswer: 'closest', clarifyingQuestion: 'clarify' }), { type: 'CLOSEST_SUPPORTED', answer: 'closest' });
  assert.deepEqual(chooseFallback({ clarifyingQuestion: 'clarify' }), { type: 'CLARIFICATION', answer: 'clarify' });
});

test('fallback engine maps every internal reason to a safe user response', () => {
  for (const reason of Object.values(FALLBACK_REASONS)) {
    const response = chooseFallback({ reason });
    assert.equal(response.answer.includes(reason), false);
    assert.equal(response.answer.includes('API'), false);
    assert.equal(response.answer.includes('field'), false);
  }
});
