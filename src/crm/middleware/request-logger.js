const { resolveRequestedModule } = require('../validators/crm.validator');
const logger = require('../../common/logging/logger');

function formatExecutionTime(start) {
  const elapsed = process.hrtime.bigint() - start;
  return `${Number(elapsed / 1000000n).toFixed(2)}ms`;
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const moduleName = resolveRequestedModule(req);

  res.on('finish', () => {
    logger.info('CRM Request', {
      endpoint: req.originalUrl,
      method: req.method,
      module: moduleName || 'unknown',
      status: res.statusCode,
      executionTime: formatExecutionTime(start),
    });
  });

  next();
}

module.exports = {
  requestLogger,
};
