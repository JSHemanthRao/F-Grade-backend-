const recordsService = require('../services/records.service');
const { resolveRequestedModule } = require('../validators/crm.validator');
const { getModuleDefinition } = require('../services/module-definition.service');
const { ALIAS_MAP } = require('../services/module-alias.service');
const assistantEngine = require('../services/assistant-engine.service');

function formatExecutionTime(startTime) {
  const elapsedNanoSeconds = process.hrtime.bigint() - startTime;
  return `${Number(elapsedNanoSeconds / 1000000n).toFixed(2)}ms`;
}

function sendQueryResponse(req, res, moduleDefinition, result, executionTime) {
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

function sendCountResponse(req, res, moduleDefinition, result, executionTime) {
  const info = result?.info || {};
  const count = Number.isFinite(info.count) ? info.count : 0;

  res.json({
    success: true,
    module: moduleDefinition.label,
    count,
    executionTime,
    source: 'Zoho CRM',
  });
}

function buildCommonOptions(req) {
  const requestSource = req.method === 'POST' ? req.body : req.query;

  return {
    page: requestSource?.page,
    per_page: requestSource?.per_page,
    ids: requestSource?.ids,
    fields: requestSource?.fields,
    criteria: requestSource?.criteria,
    filter: requestSource?.filter,
    filters: requestSource?.filters,
    search: requestSource?.search,
    requestText: requestSource?.requestText ?? requestSource?.request_text,
    userQuery: requestSource?.userQuery ?? requestSource?.user_query,
    question: requestSource?.question,
    prompt: requestSource?.prompt,
    message: requestSource?.message,
    sort_by: requestSource?.sort_by,
    sort_order: requestSource?.sort_order,
  };
}

function inferModuleKeyFromQuestion(question) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();

  if (!normalizedQuestion) {
    return null;
  }

  for (const [alias, moduleKey] of Object.entries(ALIAS_MAP)) {
    if (!alias || alias === moduleKey) {
      continue;
    }

    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedAlias}\\b`, 'i');

    if (pattern.test(normalizedQuestion)) {
      return moduleKey;
    }
  }

  return null;
}

async function getModuleQuery(req, res, next) {
  try {
    const moduleKey = resolveRequestedModule(req);
    const moduleDefinition = getModuleDefinition(moduleKey);
    const startTime = process.hrtime.bigint();
    const options = buildCommonOptions(req);

    console.info('[Zoho CRM] Operation selected', {
      module: moduleDefinition.label,
      operation: 'query',
    });

    const result = await recordsService.getRecords(moduleKey, options);

    sendQueryResponse(req, res, moduleDefinition, result, formatExecutionTime(startTime));
  } catch (error) {
    return next(error);
  }
}

async function getModuleCount(req, res, next) {
  try {
    const moduleKey = resolveRequestedModule(req);
    const moduleDefinition = getModuleDefinition(moduleKey);
    const startTime = process.hrtime.bigint();
    const requestSource = req.method === 'POST' ? req.body : req.query;
    const options = {
      filter: requestSource?.filter ?? requestSource?.filters,
      filters: requestSource?.filter ?? requestSource?.filters,
      criteria: requestSource?.criteria,
      search: requestSource?.search,
      requestText: requestSource?.requestText ?? requestSource?.request_text,
      userQuery: requestSource?.userQuery ?? requestSource?.user_query,
      question: requestSource?.question,
      prompt: requestSource?.prompt,
      message: requestSource?.message,
      retrieval_mode: 'count',
    };

    console.info('[Zoho CRM] Operation selected', {
      module: moduleDefinition.label,
      operation: 'count',
    });

    const result = await recordsService.getCount(moduleKey, options);

    sendCountResponse(req, res, moduleDefinition, result, formatExecutionTime(startTime));
  } catch (error) {
    return next(error);
  }
}

async function handleAssistantRequest(req, res, next) {
  try {
    const requestSource = req.method === 'POST' ? req.body : req.query;
    const question = String(requestSource?.question || requestSource?.prompt || requestSource?.message || '').trim();
    const explicitModuleKey = resolveRequestedModule(req);
    const inferredModuleKey = inferModuleKeyFromQuestion(question);
    const moduleKey = explicitModuleKey || inferredModuleKey;
    const moduleDefinition = getModuleDefinition(moduleKey);
    const startTime = process.hrtime.bigint();

    if (!moduleDefinition) {
      return res.status(400).json({ success: false, message: 'Unsupported CRM module.' });
    }

    if (!question) {
      return res.status(400).json({ success: false, message: 'A question is required.' });
    }

    console.info('[Zoho CRM] Operation selected', {
      module: moduleDefinition?.label || 'Unknown',
      operation: 'assistant',
      question,
    });

    const engineResponse = await assistantEngine.handleAssistantRequest({ question, module: moduleKey });

    return res.json({
      ...engineResponse,
      executionTime: formatExecutionTime(startTime),
      source: 'Zoho CRM',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getModuleCount,
  getModuleQuery,
  getModuleRecords: getModuleQuery,
  handleAssistantRequest,
};
