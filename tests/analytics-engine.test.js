const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateResult } = require('../src/crm/services/assistant/calculator.service');

test('count calculation returns record count', () => {
  const plan = { steps: [{ type: 'count' }] };
  const datasets = [{ module: 'leads', result: { data: [{ id: 1 }, { id: 2 }, { id: 3 }] } }];
  const { calculations, limitations } = calculateResult(plan, datasets);

  assert.equal(calculations.length, 1);
  assert.equal(calculations[0].type, 'count');
  assert.equal(calculations[0].value, 3);
  assert.deepEqual(limitations, []);
});

test('aggregate calculation computes sum, average, minimum, maximum, and total revenue', () => {
  const plan = { steps: [{ type: 'aggregate' }], intents: ['AGGREGATION'], question: 'What is the average deal value?'};
  const datasets = [{ module: 'deals', result: { data: [{ Amount: 100 }, { Amount: 200 }, { Amount: 50 }] } }];
  const { calculations, limitations } = calculateResult(plan, datasets);
  const values = calculations.reduce((map, item) => ({ ...map, [item.type]: item.value }), {});

  assert.equal(values.sum, 350);
  assert.equal(values.average, 350 / 3);
  assert.equal(values.minimum, 50);
  assert.equal(values.maximum, 200);
  assert.equal(values.total_revenue, 350);
  assert.deepEqual(limitations, []);
});

test('pipeline value is calculated only for open deals with amount values', () => {
  const plan = { steps: [{ type: 'analytics' }], intents: ['ANALYTICS'] };
  const datasets = [{ module: 'deals', result: { data: [
    { Stage: 'Negotiation', Amount: 100 },
    { Stage: 'Closed Won', Amount: 200 },
    { Stage: 'Proposal', Amount: 150 },
    { Stage: 'Closed Lost', Amount: 50 },
    { Stage: 'Negotiation', Amount: null },
  ] } }];

  const { calculations } = calculateResult(plan, datasets);
  const pipeline = calculations.find((item) => item.type === 'pipeline_value');

  assert.equal(pipeline.value, 250);
});

test('growth metrics calculate month-over-month, quarter-over-quarter, and year-over-year only when comparison periods exist', () => {
  const plan = { steps: [{ type: 'analytics' }], intents: ['ANALYTICS'] };
  const datasets = [{ module: 'deals', result: { data: [
    { Amount: 100, Created_Date: '2024-01-15' },
    { Amount: 200, Created_Date: '2024-02-15' },
    { Amount: 150, Created_Date: '2024-03-01' },
    { Amount: 100, Created_Date: '2024-10-01' },
    { Amount: 300, Created_Date: '2025-01-05' },
  ] } }];

  const { calculations, limitations } = calculateResult(plan, datasets);
  const growthMap = calculations.reduce((acc, item) => ({ ...acc, [item.type]: item.value }), {});

  assert.equal(typeof growthMap.month_over_month_growth, 'object');
  assert.equal(growthMap.month_over_month_growth.growth, -0.25);
  assert.equal(typeof growthMap.quarter_over_quarter_growth, 'object');
  assert.equal(typeof growthMap.year_over_year_growth, 'object');
  assert.deepEqual(limitations.filter((item) => item.metric.includes('growth')), []);
});

test('win rate calculation is skipped when closed won or closed lost counts are unavailable', () => {
  const plan = { steps: [{ type: 'analytics' }], intents: ['ANALYTICS'] };
  const datasets = [{ module: 'deals', result: { data: [
    { Stage: 'Closed Won', Amount: 100 },
    { Stage: 'Negotiation', Amount: 150 },
  ] } }];

  const { calculations, limitations } = calculateResult(plan, datasets);
  const winRate = calculations.find((item) => item.type === 'win_rate');

  assert.equal(winRate, undefined);
  assert.ok(limitations.some((item) => item.metric === 'win_rate'));
});

test('conversion rate and conversion count are calculated only when conversion fields exist', () => {
  const plan = { steps: [{ type: 'conversion_count', metric: 'rate' }], question: 'What is the conversion rate?' };
  const datasets = [{ module: 'leads', result: { data: [
    { Converted__s: true },
    { Converted__s: false },
    { Converted__s: 'true' },
  ] } }];

  const { calculations, limitations } = calculateResult(plan, datasets);
  const conversionRate = calculations.find((item) => item.type === 'conversion_rate');
  const conversionCount = calculations.find((item) => item.type === 'conversion_count');

  assert.equal(conversionRate.value, 2 / 3);
  assert.equal(conversionCount.value, 2);
  assert.deepEqual(limitations, []);
});

test('top owners and stage distribution are produced for analytics requests', () => {
  const plan = { steps: [{ type: 'analytics' }], intents: ['ANALYTICS'] };
  const datasets = [{ module: 'deals', result: { data: [
    { Owner: { name: 'Alice' }, Stage: 'Closed Won' },
    { Owner: { name: 'Bob' }, Stage: 'Negotiation' },
    { Owner: { name: 'Alice' }, Stage: 'Closed Lost' },
  ] } }];

  const { calculations } = calculateResult(plan, datasets);
  const topOwners = calculations.find((item) => item.type === 'top_owners');
  const stageDistribution = calculations.find((item) => item.type === 'stage_distribution');

  assert.equal(topOwners.value[0].owner, 'Alice');
  assert.equal(topOwners.value[0].count, 2);
  assert.equal(stageDistribution.value['Closed Won'], 1);
  assert.equal(stageDistribution.value.Negotiation, 1);
});

test('month-wise, quarter-wise, and year-wise metrics are generated from date fields', () => {
  const plan = { steps: [{ type: 'analytics' }], intents: ['ANALYTICS'] };
  const datasets = [{ module: 'deals', result: { data: [
    { Amount: 100, CreatedDate: '2024-01-01' },
    { Amount: 150, CreatedDate: '2024-02-01' },
    { Amount: 200, CreatedDate: '2024-04-01' },
    { Amount: 250, CreatedDate: '2025-01-01' },
  ] } }];

  const { calculations } = calculateResult(plan, datasets);
  const monthMetrics = calculations.find((item) => item.type === 'month_wise_metrics');
  const quarterMetrics = calculations.find((item) => item.type === 'quarter_wise_metrics');
  const yearMetrics = calculations.find((item) => item.type === 'year_wise_metrics');

  assert.equal(monthMetrics.value.monthlyTotals['2024-01'], 100);
  assert.equal(quarterMetrics.value.quarterlyTotals['2024-Q1'], 250);
  assert.equal(yearMetrics.value.yearlyTotals['2025'], 250);
});

test('missing required fields add limitations and avoid unsupported calculations', () => {
  const plan = { steps: [{ type: 'analytics' }], intents: ['ANALYTICS'] };
  const datasets = [{ module: 'deals', result: { data: [{ id: 1 }, { id: 2 }] } }];
  const { calculations, limitations } = calculateResult(plan, datasets);

  assert.equal(calculations.length, 0);
  assert.ok(limitations.some((item) => item.metric === 'owner_distribution'));
  assert.ok(limitations.some((item) => item.metric === 'stage_distribution'));
  assert.ok(limitations.some((item) => item.metric === 'month_over_month_growth'));
});

test('empty dataset returns no metrics and structured limitations when analytics are requested', () => {
  const plan = { steps: [{ type: 'analytics' }], intents: ['ANALYTICS'] };
  const datasets = [{ module: 'deals', result: { data: [] } }];
  const { calculations, limitations } = calculateResult(plan, datasets);

  assert.equal(calculations.length, 0);
  assert.ok(limitations.some((item) => item.metric === 'owner_distribution'));
  assert.ok(limitations.some((item) => item.metric === 'month_wise_metrics'));
});
