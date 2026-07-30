const router = require('./routes');
const openapiSpec = require('./openapi/crm.openapi.json');

module.exports = {
  name: 'crm',
  displayName: 'Zoho CRM',
  basePath: '/api/crm',
  router,
  openapiSpec,
};
