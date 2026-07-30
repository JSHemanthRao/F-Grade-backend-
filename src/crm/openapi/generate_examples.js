const fs = require('fs');
const path = require('path');
const moduleService = require('../services/module-definition.service');
const defs = moduleService.getModuleDefinitions();
const file = path.join(__dirname, 'crm.openapi.json');

let spec;
try {
  const raw = fs.readFileSync(file, 'utf8');
  spec = JSON.parse(raw.replace(/^\uFEFF/, ''));
} catch (err) {
  console.error('Failed to read or parse crm.openapi.json:', err);
  process.exit(1);
}

function makeExampleObject(def) {
  const obj = { id: '1234567000000123456' };
  const fields = def.defaultFields || [];
  fields.forEach((f, i) => {
    // simple placeholder values based on field name
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

let updated = false;
defs.forEach((def) => {
  const p = '/' + def.key;
  const pathObj = spec.paths && spec.paths[p];
  if (!pathObj || !pathObj.get) return;

  const exampleData = makeExampleObject(def);
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

  const responses = pathObj.get.responses || {};
  responses['200'] = responses['200'] || { description: 'Successful response', content: { 'application/json': { schema: { $ref: '#/components/schemas/CRMResponse' } } } };
  const appJson = responses['200'].content['application/json'];
  appJson.examples = appJson.examples || {};
  appJson.examples.default = { value: exampleResponse };

  pathObj.get.responses = responses;
  spec.paths[p] = pathObj;
  updated = true;
});

if (!updated) {
  console.log('No matching per-module GET paths found to update.');
  process.exit(0);
}

fs.writeFileSync(file, JSON.stringify(spec, null, 2), 'utf8');
console.log('crm.openapi.json updated with module-specific examples.');
