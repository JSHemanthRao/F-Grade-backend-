const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQueryPlan } = require('../src/crm/services/query-builder.service');
const { fetchAllPages } = require('../src/crm/services/pagination.service');
const { formatResponse } = require('../src/crm/services/assistant/formatter.service');
const recordsService = require('../src/crm/services/records.service');
const assistantEngine = require('../src/crm/services/assistant-engine.service');
const { buildExecutionPlan } = require('../src/crm/services/assistant/planner.service');
const { optimizeExecutionPlan } = require('../src/crm/services/assistant/query-optimizer.service');
const { generateInsights } = require('../src/crm/services/assistant/insight.service');

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
  assert.equal(response.followUpQuestions.length, 2);
  assert.doesNotMatch(output, /Would you like|Shall I|Do you want me|page|per_page|pagination/i);
});

test('multi-module comparisons retrieve each module independently before calculating', async () => {
  const originalGetRecords = recordsService.getRecords;
  const calls = [];
  recordsService.getRecords = async (moduleKey, options) => {
    calls.push({ moduleKey, options });
    return { data: [{ id: `${moduleKey}-${calls.length}`, Amount: moduleKey === 'deals' ? 100 : 0 }], info: { count: 1 } };
  };

  try {
    const response = await assistantEngine.handleAssistantRequest({ question: 'Compare leads and deals created this month' });
    assert.deepEqual(calls.map((call) => call.moduleKey), ['leads', 'deals']);
    assert.equal(response.calculations.some((item) => item.type === 'multi_module_comparison'), true);
    assert.match(response.summary, /leads/);
    assert.match(response.summary, /deals/);
  } finally {
    recordsService.getRecords = originalGetRecords;
  }
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

test('query optimization selects only fields needed by the requested calculation', () => {
  const optimized = optimizeExecutionPlan(buildExecutionPlan('Total Closed Won deal revenue this month'));
  const fields = optimized.steps.find((step) => step.type === 'aggregate').requiredFieldsByModule.deals;
  assert.ok(fields.includes('Amount'));
  assert.ok(fields.includes('Stage'));
  assert.ok(fields.includes('Closing_Date'));
  assert.equal(fields.includes('Email'), false);
});

test('failed CRM tasks retry once with an alternate retrieval strategy', async () => {
  const originalGetRecords = recordsService.getRecords;
  let calls = 0;
  recordsService.getRecords = async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary CRM failure');
    return { data: [{ id: 'deal-1', Amount: 125 }], info: { count: 1, more_records: false } };
  };

  try {
    const response = await assistantEngine.handleAssistantRequest({ question: 'Show deals' });
    assert.equal(calls, 2);
    assert.equal(response.success, true);
    assert.equal(response.data.length, 1);
  } finally {
    recordsService.getRecords = originalGetRecords;
  }
});

test('context datasets are reused for a follow-up without another CRM call', async () => {
  const originalGetRecords = recordsService.getRecords;
  let calls = 0;
  recordsService.getRecords = async () => {
    calls += 1;
    return { data: [], info: { count: 0 } };
  };

  try {
    const response = await assistantEngine.handleAssistantRequest({
      question: 'Compare with last month',
      context: {
        modules: ['deals'],
        lastQuestion: 'Show deals',
        datasets: [{ module: 'deals', period: null, requestFingerprint: 'Show deals', result: { data: [{ id: 'deal-1' }], info: { count: 1, more_records: false } } }],
      },
    });
    assert.equal(calls, 1);
    assert.equal(response.data.length, 1);
  } finally {
    recordsService.getRecords = originalGetRecords;
  }
});

test('business insights report only supported highest, lowest, and growth facts', () => {
  const insights = generateInsights(
    { question: 'Compare deal values', steps: [] },
    [{ result: { data: [{ id: '1', Amount: 100 }, { id: '2', Amount: 250 }] } }],
    [],
  );
  assert.equal(insights.some((insight) => insight.type === 'highest_value' && insight.message.includes('250')), true);
  assert.equal(insights.some((insight) => insight.type === 'lowest_value' && insight.message.includes('100')), true);
});

test('performance report planning coordinates required CRM datasets', () => {
  const plan = buildExecutionPlan('Complete CRM Performance Report');
  assert.equal(plan.report, true);
  assert.deepEqual(plan.modules, ['leads', 'contacts', 'accounts', 'deals']);
  assert.deepEqual(plan.steps.map((step) => step.module), ['leads', 'contacts', 'accounts', 'deals']);
  assert.deepEqual(plan.steps.at(-1).reportTasks, ['pipeline', 'closed_won', 'closed_lost', 'stage_distribution', 'top_customers', 'top_reps']);
});

test('performance report retrieves modules, merges data, and calculates business analytics', async () => {
  const originalGetRecords = recordsService.getRecords;
  const calls = [];
  recordsService.getRecords = async (moduleKey) => {
    calls.push(moduleKey);
    const data = moduleKey === 'deals'
      ? [
        { id: 'd1', Amount: 100, Stage: 'Closed Won', Owner: { name: 'Asha' } },
        { id: 'd2', Amount: 200, Stage: 'Negotiation', Owner: { name: 'Asha' } },
        { id: 'd3', Amount: 300, Stage: 'Closed Lost', Owner: { name: 'Ravi' } },
      ]
      : [{ id: `${moduleKey}-1`, Owner: { name: 'Asha' } }];
    return { data, info: { count: data.length, more_records: false } };
  };

  try {
    const response = await assistantEngine.handleAssistantRequest({ question: 'Complete CRM Performance Report' });
    assert.deepEqual(calls, ['leads', 'contacts', 'accounts', 'deals']);
    assert.equal(response.success, true);
    assert.equal(response.calculations.some((item) => item.type === 'stage_distribution'), true);
    assert.equal(response.calculations.some((item) => item.type === 'pipeline' && item.value === 200), true);
    assert.equal(response.calculations.some((item) => item.type === 'top_owners'), true);
  } finally {
    recordsService.getRecords = originalGetRecords;
  }
});
