const router = require('./routes');
const openapiSpec = require('./openapi/people.openapi.json');

module.exports = {
  name: 'people',
  displayName: 'Zoho People',
  basePath: '/api/people',
  router,
  openapiSpec,
};
