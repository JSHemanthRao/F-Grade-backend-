const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildExecutionPlan } = require('../src/crm/services/assistant/planner.service');
const { detectTimeRange } = require('../src/crm/services/assistant/date-detector.service');
const { detectEntities } = require('../src/crm/services/assistant/entity-detector.service');
const { resolveDependencies } = require('../src/crm/services/assistant/dependency-resolver.service');

function monthStart(offset = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}

test('planner creates a deterministic multi-intent plan with dependencies', () => {
  const question = 'Compare Closed Won value and show top customers for July and August';
  const first = buildExecutionPlan(question);
  const second = buildExecutionPlan(question);

  assert.deepEqual(first, second);
  assert.deepEqual(first.modules, ['deals', 'accounts']);
  assert.ok(first.intents.includes('COMPARE'));
  assert.ok(first.intents.includes('ANALYTICS'));
  assert.deepEqual(first.entities.stages, ['Closed Won']);
  assert.equal(first.timeRange.periods.length, 2);
  assert.equal(first.steps[0].periods.length, 2);
  assert.equal(first.tasks.filter((task) => task.engine === 'RetrievalEngine').length, 4);
  assert.ok(first.tasks.find((task) => task.engine === 'AnalyticsEngine'));
  assert.ok(first.tasks.some((task) => task.dependencies.length > 0));
});

test('planner resolves conversation references and continues pagination', () => {
  const plan = buildExecutionPlan('Show remaining', {
    lastQuestion: 'Show first 20 deals',
    modules: ['deals'],
    pagination: { page: 2, per_page: 20 },
    datasets: [{ module: 'deals', result: { data: [{ id: 'deal-1' }] } }],
  });

  assert.deepEqual(plan.modules, ['deals']);
  assert.equal(plan.conversation.reference, 'remaining');
  assert.equal(plan.relationships.includes('conversation_reference'), true);
  assert.equal(plan.steps[0].page, 3);
  assert.equal(plan.steps[0].per_page, 20);
  assert.equal(plan.steps[0].offset, 40);
  assert.equal(plan.steps[0].explicit, true);
});

test('planner carries a prior module into a comparison follow-up', () => {
  const plan = buildExecutionPlan('Compare them with last month', {
    lastPlan: { modules: ['deals'] },
  });

  assert.deepEqual(plan.modules, ['deals']);
  assert.equal(plan.timeRange.range, 'last_month');
  assert.equal(plan.relationships.includes('conversation_reference'), true);
  assert.equal(plan.steps.some((step) => step.type === 'compare'), true);
});

test('date detector normalizes supported relative and historical windows', () => {
  const now = new Date();
  const currentMonth = monthStart();
  const previousMonth = monthStart(-1);
  const lastSix = detectTimeRange('last 6 months');
  const lastTwelve = detectTimeRange('last 12 months');
  const current = detectTimeRange('month-to-date');
  const previous = detectTimeRange('previous month');
  const historical = detectTimeRange('July 2026');
  const range = detectTimeRange('between January and March');

  assert.equal(lastSix.monthCount, 6);
  assert.equal(lastSix.periods.length, 6);
  assert.equal(lastSix.historicalOnly, true);
  assert.equal(lastSix.includesCurrentMonth, false);
  assert.equal(lastTwelve.monthCount, 12);
  assert.equal(lastTwelve.periods.length, 12);
  assert.equal(lastTwelve.historicalOnly, true);
  assert.equal(current.includesCurrentMonth, true);
  assert.equal(current.historicalOnly, false);
  assert.equal(current.startDate, currentMonth.toISOString().replace('.000Z', 'Z'));
  assert.equal(new Date(current.endDate).toISOString().slice(0, 10), now.toISOString().slice(0, 10));
  assert.equal(previous.historicalOnly, true);
  assert.equal(previous.startDate, previousMonth.toISOString().replace('.000Z', 'Z'));
  assert.equal(historical.historicalOnly, true);
  assert.equal(historical.includesCurrentMonth, false);
  assert.equal(range.range, 'custom_range');
  assert.equal(range.periods.length, 3);
});

test('entity detector returns business entities without treating pagination as an amount', () => {
  const entities = detectEntities('Show next 35 Closed Won deals owned by Alice from Web in India above ₹1,00,000');

  assert.deepEqual(entities.stages, ['Closed Won']);
  assert.deepEqual(entities.owners, ['Alice']);
  assert.deepEqual(entities.leadSources, ['Web']);
  assert.deepEqual(entities.countries, ['India']);
  assert.deepEqual(entities.amounts, ['₹1,00,000']);
});

test('dependency resolver removes duplicate tasks and preserves retrieval-before-analytics order', () => {
  const step = { type: 'compare', module: 'deals', timeRange: { range: 'last_month' } };
  const resolved = resolveDependencies([step, { ...step }]);

  assert.equal(resolved.steps.length, 1);
  assert.equal(resolved.tasks.length, 2);
  assert.equal(resolved.tasks[0].engine, 'RetrievalEngine');
  assert.equal(resolved.tasks[1].engine, 'AnalyticsEngine');
  assert.deepEqual(resolved.tasks[1].dependencies, [resolved.tasks[0].id]);
});

test('planner has no CRM client or analytics implementation dependency', () => {
  const plannerDirectory = path.join(__dirname, '..', 'src', 'crm', 'services', 'assistant');
  const plannerSources = [
    'planner.service.js',
    'conversation-context.service.js',
    'entity-detector.service.js',
    'metric-detector.service.js',
    'relationship-detector.service.js',
    'dependency-resolver.service.js',
    'task-generator.service.js',
    'date-detector.service.js',
  ].map((file) => fs.readFileSync(path.join(plannerDirectory, file), 'utf8')).join('\n');

  assert.doesNotMatch(plannerSources, /axios|zohoClient|recordsService|getRecords|calculateResult|formatResponse/);
});
