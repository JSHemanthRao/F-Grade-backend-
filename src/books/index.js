const router = require('./routes');
const openapiSpec = require('./openapi/books.openapi.json');

module.exports = {
  name: 'books',
  displayName: 'Zoho Books',
  basePath: '/api/books',
  router,
  openapiSpec,
};
