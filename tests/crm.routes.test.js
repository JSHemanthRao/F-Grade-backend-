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

test('CRM service automatically merges all Zoho pages when pagination is not explicit', async () => {
  const originalGet = zohoClient.get;
  const requests = [];
  const pages = [
    { data: [{ id: '1' }], info: { more_records: true } },
    { data: [{ id: '2' }], info: { more_records: true } },
    { data: [{ id: '3' }], info: { more_records: false } },
  ];

  zohoClient.get = async (url, config) => {
    requests.push({ url, config });
    return { data: pages[requests.length - 1] };
  };

  try {
    const result = await recordsService.getRecords('deals', {
      fields: ['Deal_Name', 'Stage'],
      criteria: "(Stage:equals:Closed Won)",
      sort_by: 'Closing_Date',
      sort_order: 'desc',
    });

    assert.equal(requests.length, 3);
    assert.deepEqual(
      requests.map((request) => request.config.params.page),
      [1, 2, 3]
    );
    requests.forEach((request) => {
      assert.equal(request.url, '/crm/v8/Deals');
      assert.equal(request.config.params.per_page, 200);
      assert.equal(request.config.params.fields, 'Deal_Name,Stage');
      assert.equal(request.config.params.criteria, "(Stage:equals:Closed Won)");
      assert.equal(request.config.params.sort_by, 'Closing_Date');
      assert.equal(request.config.params.sort_order, 'desc');
    });
    assert.deepEqual(result.data, [{ id: '1' }, { id: '2' }, { id: '3' }]);
    assert.deepEqual(result.info, {
      more_records: false,
      count: 3,
      page: 1,
      per_page: 200,
    });
  } finally {
    zohoClient.get = originalGet;
  }
});

test('CRM service switches to next_page_token after 2000 records', async () => {
  const originalGet = zohoClient.get;
  const requests = [];

  zohoClient.get = async (url, config) => {
    requests.push({ url, config });
    const requestNumber = requests.length;

    if (requestNumber <= 9) {
      return { data: { data: [{ id: String(requestNumber) }], info: { more_records: true } } };
    }

    if (requestNumber === 10) {
      return {
        data: {
          data: [{ id: '10' }],
          info: { more_records: true, next_page_token: 'token-10' },
        },
      };
    }

    return { data: { data: [{ id: '11' }], info: { more_records: false } } };
  };

  try {
    const result = await recordsService.getRecords('leads');

    assert.equal(requests.length, 11);
    assert.equal(requests[9].config.params.page, 10);
    assert.equal(requests[9].config.params.per_page, 200);
    assert.equal(requests[10].config.params.page, undefined);
    assert.equal(requests[10].config.params.page_token, 'token-10');
    assert.equal(requests[10].config.params.per_page, 200);
    assert.equal(result.data.length, 11);
    assert.equal(result.info.count, 11);
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
