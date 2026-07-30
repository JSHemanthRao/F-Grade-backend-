const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../src/crm/routes');
const controller = require('../src/crm/controllers/crm.controller');
const recordsService = require('../src/crm/services/records.service');
const { zohoClient } = require('../src/common/config/axios');

const expectedRoutes = [
  '/',
  '/query',
  '/leads',
  '/contacts',
  '/accounts',
  '/deals',
  '/tasks',
  '/events',
  '/calls',
  '/meetings',
  '/notes',
  '/products',
  '/vendors',
  '/quotes',
  '/sales-orders',
  '/purchase-orders',
  '/campaigns',
  '/cases',
  '/solutions',
  '/users',
  '/organization',
  '/partners',
  '/enterprise-leads',
  '/renewal-accounts',
  '/service-provider',
  '/co-operative-banks',
  '/documents',
];

test('CRM router exposes one GET route per requested module', () => {
  const stack = router.stack || [];

  const registeredRoutes = stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path)
    .sort();

  assert.equal(registeredRoutes.length, expectedRoutes.length);
  expectedRoutes.forEach((route) => {
    assert.ok(registeredRoutes.includes(route), `${route} should be registered`);
  });
});

test('CRM controller resolves the requested module from the matched route path', async () => {
  const originalGetRecords = recordsService.getRecords;
  let receivedModule;

  recordsService.getRecords = async (moduleName) => {
    receivedModule = moduleName;
    return { data: [], info: {} };
  };

  const req = {
    route: { path: '/leads' },
    query: {},
    body: {},
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
    },
  };

  await controller.getModuleRecords(req, res, () => {});

  assert.equal(receivedModule, 'leads');
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.module, 'Leads');
  assert.deepEqual(res.payload.data, []);

  recordsService.getRecords = originalGetRecords;
});

test('CRM controller resolves the requested module from the query string', async () => {
  const originalGetRecords = recordsService.getRecords;
  let receivedModule;

  recordsService.getRecords = async (moduleName) => {
    receivedModule = moduleName;
    return { data: [], info: {} };
  };

  const req = {
    route: { path: '/' },
    query: { module: 'accounts' },
    body: {},
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
    },
  };

  await controller.getModuleRecords(req, res, () => {});

  assert.equal(receivedModule, 'accounts');
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.module, 'Accounts');
  assert.deepEqual(res.payload.data, []);

  recordsService.getRecords = originalGetRecords;
});

test('CRM service applies module fields and forwards Zoho query parameters', async () => {
  const originalGet = zohoClient.get;
  const requests = [];

  zohoClient.get = async (url, config) => {
    requests.push({ url, config });
    return { data: { data: [{ id: '1' }], info: {} } };
  };

  try {
    const result = await recordsService.getRecords('deals', {
      page: 2,
      per_page: 5,
      ids: ['1', '2'],
      fields: ['Deal_Name', 'Amount'],
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/crm/v8/Deals');
    assert.deepEqual(requests[0].config.params, {
      page: 2,
      per_page: 5,
      ids: '1,2',
      fields: 'Deal_Name,Amount',
    });
    assert.deepEqual(result, { data: [{ id: '1' }], info: {} });
  } finally {
    zohoClient.get = originalGet;
  }
});

test('CRM service surfaces Zoho API failures without fallback data', async () => {
  const originalGet = zohoClient.get;
  const error = {
    message: 'Zoho rejected the request',
    response: {
      status: 400,
      data: { code: 400, message: 'Bad request' },
    },
  };

  zohoClient.get = async () => {
    throw error;
  };

  try {
    await assert.rejects(() => recordsService.getRecords('leads'), (thrown) => thrown === error);
  } finally {
    zohoClient.get = originalGet;
  }
});

test('CRM service uses the requested co-operative-banks field list', async () => {
  const originalGet = zohoClient.get;
  const requests = [];

  zohoClient.get = async (url, config) => {
    requests.push({ url, config });
    return { data: { data: [{ id: '1' }], info: {} } };
  };

  try {
    await recordsService.getRecords('co-operative-banks');

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/crm/v8/Co_operative_Banks');
    assert.equal(requests[0].config.params.fields, 'Co_operative_Banks_Name,Contact_Name,Contact_Number,State_UT');
  } finally {
    zohoClient.get = originalGet;
  }
});

test('CRM service uses the requested partners field list', async () => {
  const originalGet = zohoClient.get;
  const requests = [];

  zohoClient.get = async (url, config) => {
    requests.push({ url, config });
    return { data: { data: [{ id: '1' }], info: {} } };
  };

  try {
    await recordsService.getRecords('partners');

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/crm/v8/Partners');
    assert.equal(
      requests[0].config.params.fields,
      'Partner_Name,Company_Name,Partner_Owner,Partner_Status,Email,Created_Time,Modified_Time,Last_Activity_Time,End_Customer_Accounts,id'
    );
  } finally {
    zohoClient.get = originalGet;
  }
});

test('CRM service uses the requested enterprise leads field list', async () => {
  const originalGet = zohoClient.get;
  const requests = [];

  zohoClient.get = async (url, config) => {
    requests.push({ url, config });
    return { data: { data: [{ id: '1' }], info: {} } };
  };

  try {
    await recordsService.getRecords('enterprise-leads');

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/crm/v8/Enterprise');
    assert.equal(
      requests[0].config.params.fields,
      'Enterprise_Name,Email,Enterprise_Owner,Modified_Time,Created_Time,Created_By,Connected_To,id'
    );
  } finally {
    zohoClient.get = originalGet;
  }
});

test('CRM service does not expose unsupported Projects through CRM Records API', async () => {
  await assert.rejects(
    () => recordsService.getRecords('projects'),
    /Unsupported CRM module: projects/
  );
});

test('CRM service surfaces invalid Zoho field names explicitly', async () => {
  const originalGet = zohoClient.get;
  const error = {
    message: 'Zoho rejected the request',
    response: {
      status: 400,
      data: { code: 400, message: "The field 'Contact_Name' does not exist" },
    },
  };

  zohoClient.get = async () => {
    throw error;
  };

  try {
    await assert.rejects(
      () => recordsService.getRecords('co-operative-banks'),
      (thrown) => thrown?.invalidFields?.includes('Contact_Name') && thrown.message.includes('Contact_Name')
    );
  } finally {
    zohoClient.get = originalGet;
  }
});
