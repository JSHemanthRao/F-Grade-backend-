const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQueryPlan } = require('../src/crm/services/query-builder.service');

test('date and analytics questions always use COQL instead of Search criteria', () => {
  const cases = [
    ['Deals this month', 'deals', 'Closing_Date'],
    ['Closed Won this month', 'deals', 'Closing_Date'],
    ['Deals closed last month', 'deals', 'Closing_Date'],
    ['Lead conversions last month', 'leads', 'Converted_Date_Time'],
    ['Revenue comparison', 'deals', null],
    ['Average deal value', 'deals', null],
    ['Monthly comparison', 'deals', null],
  ];

  cases.forEach(([question, moduleKey, expectedDateField]) => {
    const plan = buildQueryPlan(moduleKey, { question });
    assert.equal(plan.mode, 'coql', question);
    assert.match(plan.query, /^select .+ from /i);
    assert.equal(plan.query.includes(':equals'), false);
    if (expectedDateField) assert.equal(plan.query.includes(expectedDateField), true, question);
  });
});

test('simple searchable requests continue to use the Search API', () => {
  const plan = buildQueryPlan('leads', { question: 'Show leads from Advertisement' });
  assert.equal(plan.mode, 'search');
});
