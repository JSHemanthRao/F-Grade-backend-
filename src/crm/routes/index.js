const express = require('express');
const { getModuleCount, getModuleQuery, handleAssistantRequest } = require('../controllers/crm.controller');
const { getSupportedModuleKeys } = require('../services/module-definition.service');
const { validateCRMCountRequest, validateCRMQueryRequest } = require('../validators/crm.validator');
const { requestLogger } = require('../middleware/request-logger');
const { crmErrorHandler } = require('../middleware/error-handler');

const router = express.Router();
router.use(requestLogger);

const supportedModules = getSupportedModuleKeys();

supportedModules.forEach((moduleName) => {
  router.get(`/${moduleName}`, validateCRMQueryRequest, getModuleQuery);
});

// New primary read-only dynamic endpoint
router.get('/count', validateCRMCountRequest, getModuleCount);
router.get('/query', validateCRMQueryRequest, getModuleQuery);
router.post('/assistant', handleAssistantRequest);

// Keep root for backward compatibility (resolves module by route path)
router.get('/', validateCRMQueryRequest, getModuleQuery);

// No POST /query - this API is read-only. Error handler remains.
router.use(crmErrorHandler);

module.exports = router;
