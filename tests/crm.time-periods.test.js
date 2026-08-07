const test = require('node:test');
const assert = require('node:assert/strict');
const { detectTimeRange } = require('../src/crm/services/assistant/time-detector.service');
const { buildExecutionPlan } = require('../src/crm/services/assistant/planner.service');
const { buildQueryPlan } = require('../src/crm/services/query-builder.service');
const { formatResponse } = require('../src/crm/services/assistant/formatter.service');

const forbiddenInferredWording = /partial month|as of July 8|as of \w+ \d+|through July 15|likely incomplete|appears incomplete|probably incomplete|strongly suggests/i;

test('last 6 months is a historical-only complete range', () => {
  const range = detectTimeRange('Show monthly deal totals for the last 6 months');
  assert.equal(range.monthCount, 6);
  assert.equal(range.historicalOnly, true);
  assert.equal(range.includesCurrentMonth, false);

  const query = buildQueryPlan('deals', { question: 'Show deals for the last 6 months' });
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().replace('.000Z', 'Z');
  assert.match(query.whereClause, new RegExp(`Closing_Date < '${currentMonthStart.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}'`));
});

test('last 12 months excludes the current month', () => {
  const range = detectTimeRange('last 12 months');
  assert.equal(range.monthCount, 12);
  assert.equal(range.historicalOnly, true);
  assert.equal(range.includesCurrentMonth, false);
});

test('current month, month-to-date, and previous month have explicit period semantics', () => {
  assert.equal(detectTimeRange('current month').includesCurrentMonth, true);
  assert.equal(detectTimeRange('month-to-date').includesCurrentMonth, true);
  assert.equal(detectTimeRange('previous month').historicalOnly, true);
  assert.equal(detectTimeRange('last month').historicalOnly, true);
});

test('historical-only named month is complete and current month gets the MTD label', () => {
  const historical = detectTimeRange('July deals');
  assert.equal(historical.historicalOnly, true);
  assert.equal(historical.includesCurrentMonth, false);

  const current = detectTimeRange(`${new Date().toLocaleString('en-US', { month: 'long' })} deals`);
  const response = formatResponse(
    { question: 'Current month deals', timeRange: current, steps: [], modules: ['deals'], intents: ['LIST'] },
    [{ module: 'deals', result: { data: [{ id: 'd1' }], info: { count: 1 } } }],
    [],
  );
  assert.match(response.summary, /Current Month \(Month-to-Date\)/);
  assert.doesNotMatch(response.summary, forbiddenInferredWording);
});

test('CRM-provided cutoff is displayed verbatim and no cutoff is inferred', () => {
  const withCutoff = formatResponse(
    { question: 'Show deals', timeRange: detectTimeRange('last month'), steps: [], modules: ['deals'], intents: ['LIST'] },
    [{ module: 'deals', result: { data: [{ id: 'd1' }], info: { data_available_through: '2026-07-15' } } }],
    [],
  );
  assert.match(withCutoff.summary, /Data available through 2026-07-15\./);

  const withoutCutoff = formatResponse(
    { question: 'Show deals', timeRange: detectTimeRange('last month'), steps: [], modules: ['deals'], intents: ['LIST'] },
    [{ module: 'deals', result: { data: [{ id: 'd1' }], info: { count: 1 } } }],
    [],
  );
  assert.doesNotMatch(withoutCutoff.summary, /Data available through|as of|partial/i);
  assert.doesNotMatch(withoutCutoff.summary, forbiddenInferredWording);
});
