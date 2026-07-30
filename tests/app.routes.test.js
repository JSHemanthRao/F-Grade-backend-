const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { APP_NAME } = require('../src/common/config/env');

function requestJson(path) {
  return new Promise((resolve, reject) => {
    const app = createApp();
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          server.close(() => resolve({ statusCode: res.statusCode, body }));
        });
      });

      req.on('error', (error) => {
        server.close(() => reject(error));
      });

      req.end();
    });
  });
}

test('root and health endpoints respond with service metadata', async () => {
  const rootResponse = await requestJson('/');
  const healthResponse = await requestJson('/health');
  const apiHealthResponse = await requestJson('/api/health');

  assert.equal(rootResponse.statusCode, 200);
  assert.equal(healthResponse.statusCode, 200);
  assert.equal(apiHealthResponse.statusCode, 200);

  const rootPayload = JSON.parse(rootResponse.body);
  const healthPayload = JSON.parse(healthResponse.body);
  const apiHealthPayload = JSON.parse(apiHealthResponse.body);

  assert.deepEqual(rootPayload, { status: 'OK', service: APP_NAME });
  assert.deepEqual(healthPayload, { status: 'OK', service: APP_NAME });
  assert.deepEqual(apiHealthPayload, { status: 'OK', service: APP_NAME });
});

test('browser requests receive JSON health payloads', async () => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const req = http.request({ hostname: '127.0.0.1', port, path: '/api/health', method: 'GET', headers: { Accept: 'application/json' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        server.close(() => {
          assert.equal(res.statusCode, 200);
          assert.equal(res.headers['content-type'].includes('application/json'), true);
          assert.deepEqual(JSON.parse(body), { status: 'OK', service: APP_NAME });
        });
      });
    });

    req.on('error', (error) => {
      server.close(() => {
        throw error;
      });
    });

    req.end();
  });
});
