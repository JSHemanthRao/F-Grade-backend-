const fs = require('fs');
const path = require('path');
const moduleService = require('../services/module-definition.service');
const defs = moduleService.getModuleDefinitions();

function makeExampleData(def) {
  const obj = { id: '1234567000000123456' };
  const fields = def.defaultFields || [];
  fields.forEach((f, i) => {
    const key = String(f);
    if (/name/i.test(key)) obj[key] = `Example ${def.label}`;
    else if (/email/i.test(key)) obj[key] = `user@example.com`;
    else if (/phone|contact_number|phone_number/i.test(key)) obj[key] = `+1-555-010${String(i).padStart(2,'0')}`;
    else if (/date|time/i.test(key)) obj[key] = new Date().toISOString();
    else if (/amount|grand|revenue/i.test(key)) obj[key] = 1000 + i;
    else obj[key] = `Sample ${key}`;
  });
  return obj;
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Zoho CRM API',
    version: '1.0.0',
    description: 'Auto-generated OpenAPI spec for /api/crm routes with module-specific examples.'
  },
  servers: [{ url: '/api/crm', description: 'Router mount point' }],
  tags: [{ name: 'CRM', description: 'Zoho CRM module endpoints' }],
  paths: {},
  components: {
    parameters: {
      Module: { name: 'module', in: 'query', schema: { type: 'string' }, description: 'CRM module key' },
      Page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Page number' },
      PerPage: { name: 'per_page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Records per page' },
      Ids: { name: 'ids', in: 'query', schema: { type: 'string' }, description: 'Comma-separated ids' },
      Fields: { name: 'fields', in: 'query', schema: { type: 'string' }, description: 'Comma-separated fields' },
      Filters: { name: 'filters', in: 'query', schema: { type: 'string' }, description: 'Zoho criteria string' }
    },
    responses: {
      BadRequest: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/CRMErrorResponse' } } } },
      ServerError: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/CRMErrorResponse' } } } }
    },
    schemas: {
      CRMQueryRequest: {
        type: 'object',
        required: ['module'],
        properties: {
          module: { type: 'string' },
          page: { type: 'integer', minimum: 1 },
          per_page: { type: 'integer', minimum: 1 },
          ids: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
          fields: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
          filters: { oneOf: [{ type: 'string' }, { type: 'object' }] }
        }
      },
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
      },
      CRMErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          module: { type: 'string' },
          status: { type: 'integer' },
          error: { type: 'string' },
          invalidFields: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
};

// generic endpoints
spec.paths['/'] = {
  get: {
    operationId: 'getCrmRecords',
    summary: 'Generic CRM module query (legacy)',
    tags: ['CRM'],
    parameters: [ { $ref: '#/components/parameters/Module' }, { $ref: '#/components/parameters/Page' }, { $ref: '#/components/parameters/PerPage' }, { $ref: '#/components/parameters/Ids' }, { $ref: '#/components/parameters/Fields' }, { $ref: '#/components/parameters/Filters' } ],
    responses: { '200': { description: 'Successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/CRMResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } }
  }
};

spec.paths['/query'] = {
  post: {
    operationId: 'postCrmQuery',
    summary: 'Query CRM using JSON payload',
    tags: ['CRM'],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CRMQueryRequest' } } } },
    responses: { '200': { description: 'Successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/CRMResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } }
  }
};

// per-module GET endpoints with examples
defs.forEach(def => {
  const p = '/' + def.key;
  const exampleData = makeExampleData(def);
  const exampleResponse = {
    success: true,
    module: def.label,
    count: 1,
    page: 1,
    per_page: 25,
    executionTime: '12.34ms',
    source: 'Zoho CRM',
    data: [exampleData]
  };

  spec.paths[p] = {
    get: {
      operationId: `get${def.label.replace(/[^a-zA-Z0-9]/g,'')}`,
      summary: `Get ${def.label}`,
      tags: ['CRM'],
      parameters: [ { $ref: '#/components/parameters/Page' }, { $ref: '#/components/parameters/PerPage' }, { $ref: '#/components/parameters/Ids' }, { $ref: '#/components/parameters/Fields' }, { $ref: '#/components/parameters/Filters' } ],
      responses: {
        '200': { description: 'Successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/CRMResponse' }, examples: { default: { value: exampleResponse } } } } },
        '400': { $ref: '#/components/responses/BadRequest' },
        '500': { $ref: '#/components/responses/ServerError' }
      }
    }
  };
});

const out = JSON.stringify(spec, null, 2);
const outPath = path.join(__dirname, 'crm.openapi.json');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath);
