const fs = require('fs');
const path = './src/crm/openapi/crm.openapi.json';
const obj = {
  openapi: '3.0.3',
  info: {
    title: 'F-Grade Zoho CRM API',
    version: '1.0.0',
    description: 'Read-only CRM endpoints (generated).'
  },
  servers: [ { url: 'https://unweighted-elois-trinomially.ngrok-free.dev' } ],
  paths: {
    '/api/crm/leads': {
      get: {
        operationId: 'getLeads',
        summary: 'Get Leads',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' }, required: false },
          { name: 'per_page', in: 'query', schema: { type: 'integer' }, required: false }
        ],
        responses: {
          '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } },
          '400': { description: 'Bad Request' },
          '500': { description: 'Server Error' }
        }
      }
    },
    '/api/crm/contacts': { get: { operationId: 'getContacts', summary: 'Get Contacts', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/accounts': { get: { operationId: 'getAccounts', summary: 'Get Accounts', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/deals': { get: { operationId: 'getDeals', summary: 'Get Deals', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/tasks': { get: { operationId: 'getTasks', summary: 'Get Tasks', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/events': { get: { operationId: 'getEvents', summary: 'Get Events', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/calls': { get: { operationId: 'getCalls', summary: 'Get Calls', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/meetings': { get: { operationId: 'getMeetings', summary: 'Get Meetings', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/notes': { get: { operationId: 'getNotes', summary: 'Get Notes', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/products': { get: { operationId: 'getProducts', summary: 'Get Products', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/vendors': { get: { operationId: 'getVendors', summary: 'Get Vendors', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/quotes': { get: { operationId: 'getQuotes', summary: 'Get Quotes', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/salesorders': { get: { operationId: 'getSalesOrders', summary: 'Get Sales Orders', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/purchaseorders': { get: { operationId: 'getPurchaseOrders', summary: 'Get Purchase Orders', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/campaigns': { get: { operationId: 'getCampaigns', summary: 'Get Campaigns', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/cases': { get: { operationId: 'getCases', summary: 'Get Cases', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/solutions': { get: { operationId: 'getSolutions', summary: 'Get Solutions', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/users': { get: { operationId: 'getUsers', summary: 'Get Users', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/renewal-accounts': { get: { operationId: 'getRenewalAccounts', summary: 'Get Renewal Accounts', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/api/crm/org': { get: { operationId: 'getOrg', summary: 'Get Organization', responses: { '200': { description: 'Successful CRM response', content: { 'application/json': { schema: { '$ref': '#/components/schemas/CRMResponse' } } } }, '400': { description: 'Bad Request' }, '500': { description: 'Server Error' } } } },
    '/health': { get: { operationId: 'getHealth', summary: 'Service health check', responses: { '200': { description: 'Service is healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } } }, examples: { ok: { value: { status: 'ok' } } } } } } } },
    '/api/health': { get: { operationId: 'getApiHealth', summary: 'API health check', responses: { '200': { description: 'API is healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } } }, examples: { ok: { value: { status: 'ok' } } } } } } } }
  },
  components: {
    schemas: {
      CRMResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          module: { type: 'string' },
          count: { type: 'integer' },
          page: { type: 'integer' },
          per_page: { type: 'integer' },
          executionTime: { type: 'string' },
          source: { type: 'string' },
          data: { type: 'array', items: { type: 'object', additionalProperties: true } }
        }
      }
    }
  }
};
fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf8');
console.log('WROTE_JSON');
