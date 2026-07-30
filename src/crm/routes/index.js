const express = require('express');
const { getModuleRecords } = require('../controllers/crm.controller');
const { getSupportedModuleKeys } = require('../services/module-definition.service');
const { validateCRMRequest } = require('../validators/crm.validator');
const { requestLogger } = require('../middleware/request-logger');
const { crmErrorHandler } = require('../middleware/error-handler');

const router = express.Router();
router.use(requestLogger);

const supportedModules = getSupportedModuleKeys();

supportedModules.forEach((moduleName) => {
  router.get(`/${moduleName}`, validateCRMRequest, getModuleRecords);
});

// New primary read-only dynamic endpoint
router.get('/query', validateCRMRequest, getModuleRecords);

// Keep root for backward compatibility (resolves module by route path)
router.get('/', validateCRMRequest, getModuleRecords);

// No POST /query - this API is read-only. Error handler remains.
router.use(crmErrorHandler);

module.exports = router;
