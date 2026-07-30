const router = require('./routes');
const openapiSpec = require('./openapi/inventory.openapi.json');

module.exports = {
  name: 'inventory',
  displayName: 'Zoho Inventory',
  basePath: '/api/inventory',
  router,
  openapiSpec,
};
