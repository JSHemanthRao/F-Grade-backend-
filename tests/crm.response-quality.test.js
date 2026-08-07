const test = require('node:test');
const assert = require('node:assert/strict');
const { formatResponse } = require('../src/crm/services/assistant/formatter.service');

const plan = {
  question: 'Show deal values',
  timeRange: { label: 'all time', range: 'all_time' },
  steps: [],
  modules: ['deals'],
  intents: ['LIST'],
};

test('response quality formats Indian currency and exposes executive key metrics', () => {
  const response = formatResponse(
    plan,
    [{ module: 'deals', result: { data: [
      { id: 'd1', Deal_Name: 'Alpha', Amount: 12500, Empty_Field: null },
      { id: 'd2', Deal_Name: 'Beta', Amount: 125000, Empty_Field: null },
    ], info: { retrievalComplete: true } } }],
    [{ type: 'sum', label: 'Total value', value: 137500 }],
  );

  assert.match(response.summary, /₹1,37,500/);
  assert.deepEqual(response.keyMetrics, [{ type: 'sum', label: 'Total value', value: '₹1,37,500' }]);
  assert.deepEqual(response.tables[0].columns, ['id', 'Deal_Name', 'Amount']);
  assert.match(response.tables[0].markdown, /\| ₹12,500 \|/);
  assert.match(response.tables[0].markdown, /\| ₹1,25,000 \|/);
  assert.equal(response.limitations.length, 0);
});

test('response quality keeps limitations brief and follow-ups supported', () => {
  const response = formatResponse(
    { ...plan, question: 'Show deals for last month', timeRange: { label: 'last month', range: 'last_month' } },
    [{ module: 'deals', result: { data: [{ id: 'd1', Owner: { name: 'Asha' }, Amount: 950 }], info: { more_records: true } } }],
    [],
  );

  assert.ok(response.limitations.some((item) => /entire requested period/.test(item)));
  assert.ok(response.suggestedNextAnalysis.every((item) => !/pdf|excel|csv|chart|dashboard|powerpoint|report/i.test(item)));
});
