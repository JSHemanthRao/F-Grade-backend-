const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadProducts } = require('../src/common/helpers/product-loader');

test('loadProducts discovers CRM module from the src directory', () => {
  const products = loadProducts(path.resolve(__dirname, '..'));
  const crmProduct = products.find((product) => product.name === 'crm');

  assert.ok(crmProduct, 'CRM product should be discovered');
  assert.equal(crmProduct.basePath, '/api/crm');
  assert.ok(crmProduct.router);
});
