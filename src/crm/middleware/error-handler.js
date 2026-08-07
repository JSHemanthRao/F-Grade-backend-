const { resolveRequestedModule } = require('../validators/crm.validator');
const logger = require('../../common/logging/logger');

function stringifyMessage(message) {
  if (typeof message === 'string') {
    return message;
  }

  if (message && typeof message === 'object') {
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  return String(message);
}

function crmErrorHandler(err, req, res, next) {
  const status = err?.status || err?.response?.status || 500;
  const moduleKey = resolveRequestedModule(req);
  const payload = {
    success: false,
    module: moduleKey || 'unknown',
    status,
    error: stringifyMessage(err?.response?.data?.message || err?.message || 'Internal server error'),
  };

  if (err?.invalidFields) {
    payload.invalidFields = err.invalidFields;
  }

  if (process.env.NODE_ENV !== 'production') {
    payload.details = err?.response?.data || null;
  }

  logger.error('CRM Error', {
    endpoint: req.originalUrl,
    module: moduleKey || 'unknown',
    status,
    error: payload.error,
  });

  res.status(status).json(payload);
}

module.exports = {
  crmErrorHandler,
};
