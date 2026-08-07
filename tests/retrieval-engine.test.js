const assert = require('node:assert/strict');
const test = require('node:test');
const { zohoClient } = require('../src/common/config/axios');
const RetrievalEngine = require('../src/crm/services/retrieval-engine.service');

function restoreZoho(originalGet, originalPost) {
  zohoClient.get = originalGet;
  zohoClient.post = originalPost;
}

test('RetrievalEngine returns a verified single-page dataset', async () => {
  const originalGet = zohoClient.get;
  zohoClient.get = async () => ({ data: { data: [{ id: 'lead-1' }], info: { more_records: false } } });
  try {
    const result = await RetrievalEngine.getRecords('leads', { retrieval_mode: 'all' });
    assert.deepEqual(result.data, [{ id: 'lead-1' }]);
    assert.equal(result.info.retrievalComplete, true);
    assert.equal(result.info.recordCount, 1);
    assert.equal(result.info.pagesFetched, 1);
    assert.equal(result.info.coveragePercentage, 100);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine fetches and merges every page at 200 records per request', async () => {
  const originalGet = zohoClient.get;
  const requests = [];
  const pages = [
    { data: Array.from({ length: 200 }, (_, index) => ({ id: `deal-${index}` })), info: { more_records: true } },
    { data: Array.from({ length: 50 }, (_, index) => ({ id: `deal-${index + 200}` })), info: { more_records: false } },
  ];
  zohoClient.get = async (_url, config) => {
    requests.push(config.params);
    return { data: pages[requests.length - 1] };
  };
  try {
    const result = await RetrievalEngine.getRecords('deals', { retrieval_mode: 'all' });
    assert.equal(result.data.length, 250);
    assert.deepEqual(requests.map((params) => params.per_page), [200, 200]);
    assert.deepEqual(requests.map((params) => params.page), [1, 2]);
    assert.equal(result.info.pagesFetched, 2);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine uses one page for plain list queries', async () => {
  const originalGet = zohoClient.get;
  const requests = [];

  zohoClient.get = async (_url, config) => {
    requests.push(config.params);
    return { data: { data: [{ id: 'deal-1' }], info: { more_records: true } } };
  };

  try {
    const result = await RetrievalEngine.getRecords('deals', { search: 'Show deals' });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].page, 1);
    assert.equal(requests[0].per_page, 25);
    assert.deepEqual(result.data, [{ id: 'deal-1' }]);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine fetches all pages for search and filter queries', async () => {
  const originalGet = zohoClient.get;
  const requests = [];
  const pages = [
    { data: [{ id: 'deal-1' }], info: { more_records: true } },
    { data: [{ id: 'deal-2' }], info: { more_records: false } },
  ];

  zohoClient.get = async (_url, config) => {
    requests.push(config.params);
    return { data: pages[requests.length - 1] };
  };

  try {
    const result = await RetrievalEngine.getRecords('deals', { search: 'Deals above ₹5,00,000' });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests.map((params) => params.page), [1, 2]);
    assert.deepEqual(requests.map((params) => params.per_page), [200, 200]);
    assert.deepEqual(result.data, [{ id: 'deal-1' }, { id: 'deal-2' }]);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine fetches all pages for date-based queries', async () => {
  const originalGet = zohoClient.get;
  const requests = [];
  const pages = [
    { data: [{ id: 'deal-1' }], info: { more_records: true } },
    { data: [{ id: 'deal-2' }], info: { more_records: false } },
  ];

  zohoClient.get = async (_url, config) => {
    requests.push(config.params);
    return { data: pages[requests.length - 1] };
  };

  try {
    const result = await RetrievalEngine.getRecords('deals', { search: 'Show deals created in June' });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests.map((params) => params.page), [1, 2]);
    assert.deepEqual(requests.map((params) => params.per_page), [200, 200]);
    assert.deepEqual(result.data, [{ id: 'deal-1' }, { id: 'deal-2' }]);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine handles 1000+ records and removes duplicate IDs', async () => {
  const originalGet = zohoClient.get;
  let requestCount = 0;
  zohoClient.get = async () => {
    const start = requestCount * 200;
    requestCount += 1;
    const remaining = 1005 - start;
    const size = Math.min(200, remaining);
    const data = Array.from({ length: size }, (_, index) => ({ id: `contact-${start + index}` }));
    if (requestCount === 3) data[0] = { id: 'contact-0' };
    return { data: { data, info: { more_records: start + size < 1005 } } };
  };
  try {
    const result = await RetrievalEngine.getRecords('contacts', { retrieval_mode: 'all' });
    assert.equal(requestCount, 6);
    assert.equal(result.data.length, 1004);
    assert.equal(result.info.duplicateRecordsRemoved, 1);
    assert.equal(result.info.retrievalComplete, true);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine retries an incomplete page sequence before returning data', async () => {
  const originalGet = zohoClient.get;
  let requestCount = 0;
  zohoClient.get = async (_url, config) => {
    requestCount += 1;
    if (requestCount === 2) throw new Error('temporary CRM failure');
    return {
      data: {
        data: [{ id: `account-${config.params.page}` }],
        info: { more_records: config.params.page === 1 },
      },
    };
  };
  try {
    const result = await RetrievalEngine.getRecords('accounts', { retrieval_mode: 'all' });
    assert.equal(requestCount, 4);
    assert.deepEqual(result.data, [{ id: 'account-1' }, { id: 'account-2' }]);
    assert.equal(result.info.retrievalComplete, true);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine reuses a dataset from the request cache', async () => {
  const originalGet = zohoClient.get;
  let requestCount = 0;
  zohoClient.get = async () => {
    requestCount += 1;
    return { data: { data: [{ id: 'event-1' }], info: { more_records: false } } };
  };
  const retrievalCache = new Map();
  try {
    const options = { retrieval_mode: 'all', question: 'Events', retrievalCache };
    const first = await RetrievalEngine.getRecords('events', options);
    const second = await RetrievalEngine.getRecords('events', options);
    assert.equal(requestCount, 1);
    assert.strictEqual(second, first);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});

test('RetrievalEngine retrieves date-range COQL requests as a complete dataset', async () => {
  const originalPost = zohoClient.post;
  const queries = [];
  zohoClient.post = async (_url, body) => {
    queries.push(body.select_query);
    return { data: { data: [{ id: 'product-1' }], info: { more_records: false } } };
  };
  try {
    const result = await RetrievalEngine.getRecords('products', {
      question: 'Products between January 1, 2026 and January 31, 2026',
      retrieval_mode: 'all',
    });
    assert.equal(queries.length, 1);
    assert.match(queries[0], /limit 2000/i);
    assert.equal(result.info.retrievalComplete, true);
    assert.equal(result.data.length, 1);
  } finally {
    restoreZoho(zohoClient.get, originalPost);
  }
});

test('RetrievalEngine supports empty datasets without fabricating records', async () => {
  const originalGet = zohoClient.get;
  zohoClient.get = async () => ({ data: { data: [], info: { more_records: false } } });
  try {
    const result = await RetrievalEngine.getRecords('leads', { retrieval_mode: 'all' });
    assert.deepEqual(result.data, []);
    assert.equal(result.info.recordCount, 0);
    assert.equal(result.info.retrievalComplete, true);
  } finally {
    restoreZoho(originalGet, zohoClient.post);
  }
});
