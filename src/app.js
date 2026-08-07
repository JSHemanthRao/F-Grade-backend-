const express = require('express');
const { APP_NAME } = require('./common/config/env');
const crm = require('./crm');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.locals.products = [crm];
  app.locals.openapiSpecs = { [crm.name]: crm.openapiSpec };

  const sendHealthPayload = (req, res) => {
    const payload = {
      status: 'OK',
      service: APP_NAME,
    };

    res.json(payload);
  };

  app.get('/', sendHealthPayload);
  app.get('/health', sendHealthPayload);
  app.get('/api/health', sendHealthPayload);

  app.use(crm.basePath, crm.router);

  app.use((err, req, res, next) => {
    const status = err?.response?.status || err?.status || 500;
    const payload = err?.response?.data || {
      message: err?.message || 'Internal server error',
    };

    res.status(status).json(payload);
  });

  return app;
}

const app = createApp();

module.exports = app;
module.exports.createApp = createApp;
