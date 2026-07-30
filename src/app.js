const express = require('express');
const { APP_NAME } = require('./common/config/env');
const { loadProducts } = require('./common/helpers/product-loader');

function createApp() {
  const app = express();
  const products = loadProducts();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.locals.products = products;
  app.locals.openapiSpecs = products.reduce((specs, product) => {
    specs[product.name] = product.openapiSpec;
    return specs;
  }, {});

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

  products.forEach((product) => {
    app.use(product.basePath, product.router);
  });

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
