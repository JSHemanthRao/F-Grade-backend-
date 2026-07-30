const recordsService = require('../services/records.service');
const { resolveRequestedModule } = require('../validators/crm.validator');
const { getModuleDefinition } = require('../services/module-definition.service');

function formatExecutionTime(startTime) {
  const elapsedNanoSeconds = process.hrtime.bigint() - startTime;
  return `${Number(elapsedNanoSeconds / 1000000n).toFixed(2)}ms`;
}

function sendStandardResponse(req, res, moduleDefinition, result, executionTime) {
  const data = Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.users)
      ? result.users
      : [];
  const info = result?.info || {};

  const count = Number.isFinite(info.count)
    ? info.count
    : data.length;
  const requestSource = req.method === 'POST' ? req.body : req.query;
  const pageValue = requestSource?.page ?? info.page;
  const perPageValue = requestSource?.per_page ?? info.per_page;

  const page = Number.isFinite(Number(pageValue))
    ? Number(pageValue)
    : 1;
  const per_page = Number.isFinite(Number(perPageValue))
    ? Number(perPageValue)
    : data.length;

  res.json({
    success: true,
    module: moduleDefinition.label,
    count,
    page,
    per_page,
    executionTime,
    source: 'Zoho CRM',
    data,
  });
}

async function getModuleRecords(req, res, next) {
  try {
    const moduleKey = resolveRequestedModule(req);
    const moduleDefinition = getModuleDefinition(moduleKey);
    const startTime = process.hrtime.bigint();
    const requestSource = req.method === 'POST' ? req.body : req.query;

    // Operation dispatch registry - easily extendable without switch statements
    const operation = String(requestSource?.operation || 'getRecords').trim();
    const operationHandlers = {
      getRecords: async (mKey, options) => recordsService.getRecords(mKey, options),
      // future operations (create, update, delete) can be added here and reuse existing service methods
    };

    const handler = operationHandlers[operation];

    if (!handler) {
      const err = new Error(`Unsupported operation: ${operation}`);
      err.status = 400;
      throw err;
    }

    const options = {
      page: requestSource?.page,
      per_page: requestSource?.per_page,
      ids: requestSource?.ids,
      fields: requestSource?.fields,
      filters: requestSource?.filters,
      search: requestSource?.search,
      sort_by: requestSource?.sort_by,
      sort_order: requestSource?.sort_order,
    };

    const result = await handler(moduleKey, options);

    sendStandardResponse(req, res, moduleDefinition, result, formatExecutionTime(startTime));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getModuleRecords,
};
