const router = require('./routes');
const openapiSpec = require('./openapi/analytics.openapi.json');

module.exports = {
  name: 'analytics',
  displayName: 'Zoho Analytics',
  basePath: '/api/analytics',
  router,
  openapiSpec,
};
