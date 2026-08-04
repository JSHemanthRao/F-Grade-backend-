const test = require('node:test');
const assert = require('node:assert/strict');
const recordsService = require('../src/crm/services/records.service');
const assistantEngine = require('../src/crm/services/assistant-engine.service');

test('assistant engine builds a count plan for simple count questions', async () => {
  const originalGetCount = recordsService.getCount;
  const originalGetRecords = recordsService.getRecords;

  recordsService.getCount = async (moduleKey, options) => {
    assert.equal(moduleKey, 'leads');
    assert.equal(options.retrieval_mode, 'count');
    return { data: [], info: { count: 18 } };
  };

  recordsService.getRecords = async () => ({ data: [], info: {} });

  try {
    const response = await assistantEngine.handleAssistantRequest({ question: 'How many leads are there?' });

    assert.equal(response.success, true);
    assert.equal(response.summary.includes('18'), true);
    assert.equal(response.calculations[0].label, 'Count');
    assert.equal(response.calculations[0].value, 18);
  } finally {
    recordsService.getCount = originalGetCount;
    recordsService.getRecords = originalGetRecords;
  }
});

test('assistant engine builds a comparison plan for month-over-month questions', async () => {
  const originalGetRecords = recordsService.getRecords;

  recordsService.getRecords = async (moduleKey, options) => {
    assert.equal(moduleKey, 'deals');
    assert.equal(options.question.includes('this month'), true);
    return {
      data: [{ Amount: 100 }, { Amount: 200 }],
      info: { count: 2 },
    };
  };

  try {
    const response = await assistantEngine.handleAssistantRequest({ question: 'Compare this month deal value with last month' });

    assert.equal(response.success, true);
    assert.equal(response.summary.includes('comparison'), true);
    assert.equal(response.calculations.length >= 1, true);
  } finally {
    recordsService.getRecords = originalGetRecords;
  }
});
