const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQueryPlan } = require('../src/crm/services/query-builder.service');
const { fetchAllPages } = require('../src/crm/services/pagination.service');
const { formatResponse } = require('../src/crm/services/assistant/formatter.service');
const recordsService = require('../src/crm/services/records.service');
const assistantEngine = require('../src/crm/services/assistant-engine.service');

test('date-oriented CRM requests become bounded business date filters', () => {
  const cases = [
    ['This month deals', 'Closing_Date >=', 'Closing_Date <'],
    ['Last 6 months deals', 'Closing_Date >=', 'Closing_Date <'],
    ['Last year deals', 'Closing_Date >=', 'Closing_Date <'],
    ['March 2026 deals', 'Closing_Date >=', 'Closing_Date <'],
    ['Deals from January 1, 2026 to March 31, 2026', 'Closing_Date >=', 'Closing_Date <'],
  ];

  cases.forEach(([question, start, end]) => {
    const plan = buildQueryPlan('deals', { question });
    assert.equal(plan.mode, 'coql');
    assert.match(plan.whereClause, new RegExp(start.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')));
    assert.match(plan.whereClause, new RegExp(end.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')));
  });
});

test('multi-page retrieval merges records and removes duplicate CRM ids', async () => {
  const calls = [];
  const result = await fetchAllPages({
    moduleKey: 'deals',
    perPage: 2,
    fetchPage: async (params) => {
      calls.push(params);
      if (params.page === 1) return { data: [{ id: 'a' }, { id: 'b' }], info: { more_records: true } };
      return { data: [{ id: 'b' }, { id: 'c' }], info: { more_records: false } };
    },
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(result.data.map((record) => record.id), ['a', 'b', 'c']);
  assert.equal(result.info.more_records, false);
});

test('business responses do not ask permission or expose retrieval mechanics', () => {
  const response = formatResponse(
    { question: 'Show deals', steps: [{ type: 'query', module: 'deals' }], modules: ['deals'], intents: ['LIST'] },
    [{ module: 'deals', result: { data: [{ id: '1' }], info: { retrievalComplete: true } } }],
    [],
  );

  const output = JSON.stringify(response);
  assert.deepEqual(response.followUpQuestions, []);
  assert.doesNotMatch(output, /Would you like|Shall I|Do you want me|page|per_page|pagination/i);
});

test('verification wording triggers a CRM execution immediately', async () => {
  const originalGetRecords = recordsService.getRecords;
  let calls = 0;
  recordsService.getRecords = async (moduleKey) => {
    calls += 1;
    assert.equal(moduleKey, 'deals');
    return { data: [{ id: 'deal-1', Stage: 'Closed Won' }], info: { count: 1 } };
  };

  try {
    const response = await assistantEngine.handleAssistantRequest({ question: 'Verify the Closed Won deals' });
    assert.equal(calls, 1);
    assert.equal(response.success, true);
    assert.equal(response.data.length, 1);
    assert.doesNotMatch(response.summary, /Would you like|Shall I|Do you want me/i);
  } finally {
    recordsService.getRecords = originalGetRecords;
  }
});
