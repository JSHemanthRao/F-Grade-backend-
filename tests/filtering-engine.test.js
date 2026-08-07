const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  applyFilterPlan,
  buildFilterPlan,
  buildFilterPlans,
} = require('../src/crm/services/filtering-engine.service');

const records = [
  { id: 'd1', Stage: 'Closed Won', Owner: { name: 'Laya M' }, Account_Name: 'Acme', Amount: '₹1,25,000', Closing_Date: '2026-07-10', Deal_Name: 'Alpha' },
  { id: 'd2', Stage: 'Negotiation', Owner: { name: 'Laya M' }, Account_Name: 'Acme', Amount: 75000, Closing_Date: '2026-07-20', Deal_Name: 'Beta' },
  { id: 'd3', Stage: 'Closed Won', Owner: { name: 'Ravi' }, Account_Name: 'Beta', Amount: 600000, Closing_Date: '2026-08-02', Deal_Name: 'Gamma' },
];

test('Filtering Engine applies stage, date, owner, company, and amount filters together', () => {
  const plan = buildFilterPlan({
    question: 'Show Closed Won deals for July owned by Laya M for company Acme above ₹1,00,000',
    module: 'deals',
  });

  assert.equal(plan.valid, true);
  assert.equal(plan.filters.length, 5);
  assert.match(plan.serverCriteria, /Stage:equals:Closed Won/);
  assert.match(plan.serverCriteria, /Closing_Date:greater_equal/);
  assert.match(plan.serverCriteria, /Owner:equals:Laya M/);
  assert.match(plan.serverCriteria, /Amount:greater_than:100000/);
  assert.deepEqual(applyFilterPlan(records, plan).records.map((record) => record.id), ['d1']);
});

test('Filtering Engine supports lead source, status, product, and text search', () => {
  const leadPlan = buildFilterPlan({ question: 'Show Advertisement leads', module: 'leads' });
  assert.equal(leadPlan.filters[0].field, 'Lead_Source');
  assert.match(leadPlan.serverCriteria, /Lead_Source:equals:Advertisement/);

  const productPlan = buildFilterPlan({ filters: [
    { field: 'Status', operator: 'equals', value: 'Active' },
    { field: 'Product_Name', operator: 'contains', value: 'Cloud' },
  ], module: 'products' });
  assert.equal(productPlan.valid, true);
  const productResult = applyFilterPlan([
    { id: 'p1', Status: 'Active', Product_Name: 'Cloud Suite' },
    { id: 'p2', Status: 'Inactive', Product_Name: 'Cloud Suite' },
  ], productPlan);
  assert.deepEqual(productResult.records.map((record) => record.id), ['p1']);
});

test('Filtering Engine supports custom ranges and specific years', () => {
  const custom = buildFilterPlan({ question: 'Show deals from January 1, 2026 to July 31, 2026', module: 'deals' });
  assert.equal(custom.valid, true);
  assert.equal(custom.filters.some((filter) => filter.logicalField === 'date'), true);
  assert.deepEqual(applyFilterPlan(records, custom).records.map((record) => record.id), ['d1', 'd2']);

  const year = buildFilterPlan({ question: 'Show deals in 2026', module: 'deals' });
  assert.equal(year.valid, true);
  assert.equal(year.filters.some((filter) => filter.source === 'year'), true);
});

test('Filtering Engine returns structured validation errors and does not continue', () => {
  const invalidField = buildFilterPlan({ filters: [{ field: 'Stage', operator: 'equals', value: 'Closed Won' }], module: 'accounts' });
  assert.equal(invalidField.valid, false);
  assert.equal(invalidField.validationErrors[0].code, 'UNSUPPORTED_FIELD');

  const invalidOperator = buildFilterPlan({ filters: [{ field: 'Amount', operator: 'approximate', value: 100 }], module: 'deals' });
  assert.equal(invalidOperator.valid, false);
  assert.equal(invalidOperator.validationErrors[0].code, 'INVALID_OPERATOR');
});

test('Filtering Engine accepts a single structured filter and operator aliases', () => {
  const plan = buildFilterPlan({
    filters: { field: 'Amount', operator: '>', value: 100000 },
    module: 'deals',
  });

  assert.equal(plan.valid, true);
  assert.equal(plan.filters[0].operator, 'greater_than');
  assert.deepEqual(applyFilterPlan(records, plan).records.map((record) => record.id), ['d1', 'd3']);
});

test('Filtering Engine falls back to local filtering when no server criteria is available', () => {
  const plan = buildFilterPlan({
    filters: { field: 'Deal_Name', operator: 'contains', value: 'alp' },
    module: 'deals',
  });
  plan.serverCriteria = null;

  assert.deepEqual(applyFilterPlan(records, plan).records.map((record) => record.id), ['d1']);
});

test('Filtering Engine refines an existing conversation filter', () => {
  const plan = buildFilterPlan({
    question: 'Show only July and above ₹1,00,000',
    module: 'deals',
    context: {
      lastPlan: {
        filterPlans: {
          deals: {
            filters: [{ field: 'Stage', operator: 'equals', value: 'Closed Won' }],
          },
        },
      },
    },
  });

  assert.equal(plan.valid, true);
  assert.equal(plan.filters.length, 3);
  assert.deepEqual(applyFilterPlan(records, plan).records.map((record) => record.id), ['d1']);
});

test('Filtering Engine ignores a filter for an unrelated module in a multi-module plan', () => {
  const plans = buildFilterPlans({ question: 'Compare Closed Won deals and top customers', modules: ['deals', 'accounts'] });
  assert.equal(plans.valid, true);
  assert.equal(plans.byModule.deals.filters.length, 1);
  assert.equal(plans.byModule.accounts.filters.length, 0);
  assert.equal(plans.byModule.accounts.ignoredFilters.length, 1);
});

test('Filtering Engine has no CRM retrieval, calculation, or formatting dependency', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'crm', 'services', 'filtering-engine.service.js'), 'utf8');
  assert.doesNotMatch(source, /axios|zohoClient|getRecords|calculateResult|formatResponse|Intl\.NumberFormat/);
});
