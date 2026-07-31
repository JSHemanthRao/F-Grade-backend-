const { zohoClient } = require('../../common/config/axios');
const { NODE_ENV } = require('../../common/config/env');
const { getModuleDefinition } = require('./module-definition.service');
const {
  DEFAULT_PER_PAGE,
  fetchAllPages,
  getRetrievalPlan,
  inferEqualityCriteria,
  getRequestText,
  hasExplicitPagination,
  normalizeRetrievalMode,
  RETRIEVAL_STRATEGIES,
} = require('./pagination.service');

function normalizeModuleKey(moduleKey) {
  if (!moduleKey) {
    throw new Error('Unsupported CRM module: module key is required');
  }

  const normalizedKey = String(moduleKey).trim().toLowerCase();
  const moduleDefinition = getModuleDefinition(normalizedKey);

  if (!moduleDefinition) {
    throw new Error(`Unsupported CRM module: ${moduleKey}`);
  }

  return normalizedKey;
}

function normalizeFields(fields) {
  if (!fields) {
    return [];
  }

  if (Array.isArray(fields)) {
    return fields.filter(Boolean).map((field) => String(field).trim()).filter(Boolean);
  }

  return String(fields)
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);
}

function buildQueryParams(moduleKey, options = {}) {
  const params = {};
  const moduleDefinition = getModuleDefinition(moduleKey);
  const {
    page,
    per_page,
    ids,
    fields: requestedFields,
    criteria,
    filters,
    sort_by,
    sort_order,
  } = options;

  const normalizedFields = normalizeFields(requestedFields);
  const fields = normalizedFields.length > 0
    ? normalizedFields.slice(0, 50)
    : moduleDefinition.defaultFields || [];

  const pageValue = Number(page);
  const perPageValue = Number(per_page);

  if (Number.isFinite(pageValue) && pageValue > 0) {
    params.page = pageValue;
  }

  if (Number.isFinite(perPageValue) && perPageValue > 0) {
    params.per_page = perPageValue;
  }

  if (ids) {
    params.ids = Array.isArray(ids) ? ids.join(',') : String(ids);
  }

  if (fields.length > 0) {
    params.fields = fields.join(',');
  }

  const criteriaValue = criteria ?? filters;

  if (criteriaValue !== undefined && criteriaValue !== null && criteriaValue !== '') {
    params.criteria = typeof criteriaValue === 'string' ? criteriaValue : JSON.stringify(criteriaValue);
  }

  if (sort_by !== undefined && sort_by !== null && sort_by !== '') {
    params.sort_by = String(sort_by);
  }

  if (sort_order !== undefined && sort_order !== null && sort_order !== '') {
    params.sort_order = String(sort_order);
  }

  return {
    params,
    fields,
  };
}


function getRequestedUrl(requestConfig = {}) {
  if (!requestConfig.baseURL || !requestConfig.url) {
    return requestConfig.url || null;
  }

  try {
    return new URL(requestConfig.url, requestConfig.baseURL).toString();
  } catch (error) {
    return requestConfig.url || null;
  }
}

function logRequestDebug(moduleKey, moduleConfig, queryParams, fields) {
  if (NODE_ENV === 'production') {
    return;
  }

  console.debug('[Zoho CRM] Request', {
    requestedModule: moduleKey,
    endpoint: moduleConfig.endpoint,
    queryParameters: queryParams,
    fields,
  });
}

function extractInvalidFields(error, fields = []) {
  const responseData = error?.response?.data;
  const responseText = typeof responseData === 'string'
    ? responseData
    : responseData?.message || error?.message || '';

  if (!responseText) {
    return [];
  }

  const fieldMatches = responseText.match(/field '([^']+)'/gi) || [];
  const invalidFields = fieldMatches
    .map((match) => match.replace(/^field\s+'|'+$/gi, '').trim())
    .filter(Boolean);

  return invalidFields.length > 0 ? invalidFields : [];
}

function logRequestError(error, moduleKey, moduleConfig, queryParams, fields) {
  const requestUrl = getRequestedUrl(error?.config || {});
  const invalidFields = extractInvalidFields(error, fields);

  console.error('[Zoho CRM] Request failed', {
    requestedModule: moduleKey,
    endpoint: moduleConfig.endpoint,
    queryParameters: queryParams,
    fields,
    invalidFields,
    httpStatus: error?.response?.status || null,
    responseBody: error?.response?.data || null,
    errorMessage: error?.message || null,
    requestedUrl: requestUrl,
    error,
  });

  if (invalidFields.length > 0) {
    error.invalidFields = invalidFields;
    error.message = `${error.message || 'Zoho rejected the request'} (invalid field(s): ${invalidFields.join(', ')})`;
  }
}

function logRetrievalPlan(moduleKey, options, retrievalPlan) {
  console.debug('[Zoho CRM] Retrieval Strategy', {
    module: moduleKey,
    'Received page': options.page ?? null,
    'Received per_page': options.per_page ?? null,
    strategy: retrievalPlan.strategy,
    reason: retrievalPlan.reason,
  });
}

function logRetrievalComplete(moduleKey, pagesFetched, totalRecords) {
  console.debug('[Zoho CRM] Retrieval complete', {
    module: moduleKey,
    'Pages fetched': pagesFetched,
    'Total merged records': totalRecords,
  });
}

function logCountComplete(moduleKey, count) {
  console.debug('[Zoho CRM] Count complete', {
    module: moduleKey,
    count,
  });
}

function normalizeCriteriaValue(criteriaValue) {
  if (criteriaValue === undefined || criteriaValue === null || criteriaValue === '') {
    return null;
  }

  return typeof criteriaValue === 'string' ? criteriaValue : JSON.stringify(criteriaValue);
}

function formatZohoDate(date) {
  return date.toISOString().replace('.000Z', 'Z');
}

function getMonthRangeCriteria(fieldName, monthOffset = 0) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset + 1, 1, 0, 0, 0, 0));

  return `((${fieldName}:greater_equal:${formatZohoDate(start)})and(${fieldName}:less_than:${formatZohoDate(end)}))`;
}

function getPreferredField(moduleDefinition, candidates) {
  const fields = Array.isArray(moduleDefinition.defaultFields) ? moduleDefinition.defaultFields : [];

  for (const candidate of candidates) {
    if (fields.some((field) => String(field).toLowerCase() === String(candidate).toLowerCase())) {
      return candidate;
    }
  }

  return candidates[0] || null;
}

function buildCountCriteria(moduleKey, moduleDefinition, options = {}, requestText = '') {
  const explicitCriteria = normalizeCriteriaValue(options.criteria ?? options.filters);

  if (explicitCriteria) {
    return explicitCriteria;
  }

  const inferredEqualityCriteria = inferEqualityCriteria(requestText);

  if (inferredEqualityCriteria) {
    return inferredEqualityCriteria;
  }

  const normalizedText = String(requestText || '').toLowerCase();

  if (/\bclosed\s+won\b/.test(normalizedText)) {
    const stageField = getPreferredField(moduleDefinition, ['Stage', 'Deal_Stage']);

    if (stageField) {
      return `(${stageField}:equals:Closed Won)`;
    }
  }

  if (/\bthis\s+month\b/.test(normalizedText)) {
    const dateField = getPreferredField(moduleDefinition, ['Created_Time', 'Modified_Time', 'Created_Time']);

    if (dateField) {
      return getMonthRangeCriteria(dateField, 0);
    }
  }

  if (/\blast\s+month\b/.test(normalizedText)) {
    const dateField = getPreferredField(moduleDefinition, ['Created_Time', 'Modified_Time', 'Created_Time']);

    if (dateField) {
      return getMonthRangeCriteria(dateField, -1);
    }
  }

  if (/\bfrom\s+advertisement\b/.test(normalizedText) || /\bcame\s+from\s+advertisement\b/.test(normalizedText)) {
    const sourceField = getPreferredField(moduleDefinition, ['Lead_Source', 'Deal_Source', 'Source']);

    if (sourceField) {
      return `(${sourceField}:equals:Advertisement)`;
    }
  }

  if (moduleKey === 'leads' && /\badvertisement\b/.test(normalizedText)) {
    return '(Lead_Source:equals:Advertisement)';
  }

  return null;
}

async function executeCountRequest(moduleKey, moduleDefinition, options = {}) {
  const requestText = getRequestText(options);
  const criteria = buildCountCriteria(moduleKey, moduleDefinition, options, requestText);
  const params = {};

  if (criteria) {
    params.criteria = criteria;
  }

  logRequestDebug(moduleKey, moduleDefinition, params, []);

  const response = await zohoClient.get(
    `/crm/v8/${moduleDefinition.endpoint}/actions/count`,
    { params }
  );

  const count = Number(response.data?.count ?? 0);

  logCountComplete(moduleKey, count);

  return {
    data: [],
    info: {
      count,
      more_records: false,
      page: 1,
      per_page: 1,
      retrievalStrategy: RETRIEVAL_STRATEGIES.COUNT,
    },
  };
}

function getPaginationInterpretation(options, requestText) {
  const hasPage = options.page !== undefined && options.page !== null && options.page !== '';
  const hasPerPage = options.per_page !== undefined && options.per_page !== null && options.per_page !== '';
  const copilotDefaultsApplied = Number(options.page) === 1 && Number(options.per_page) === 25;
  const explicitPaginationRequested = hasExplicitPagination(options, requestText);

  if (copilotDefaultsApplied && !explicitPaginationRequested) {
    return {
      copilotDefaultsApplied: true,
      explicitPaginationRequested: false,
      interpretation: 'copilot_defaults',
    };
  }

  if (hasPage || hasPerPage) {
    return {
      copilotDefaultsApplied,
      explicitPaginationRequested,
      interpretation: explicitPaginationRequested ? 'explicit_user_pagination' : 'copilot_defaults',
    };
  }

  return {
    copilotDefaultsApplied: false,
    explicitPaginationRequested: false,
    interpretation: 'not_applicable',
  };
}

function logPlannerDebug(moduleKey, options, retrievalPlan, moduleDefinition) {
  const originalUserPrompt = getRequestText(options);
  const paginationInterpretation = getPaginationInterpretation(options, originalUserPrompt);
  const retrievalMode = normalizeRetrievalMode(options.retrieval_mode ?? options.retrievalMode);

  console.debug('[Zoho CRM] Retrieval planner debug', {
    module: moduleKey,
    endpoint: moduleDefinition.endpoint,
    'Original user prompt': originalUserPrompt || null,
    'retrieval_mode received': retrievalMode,
    'Detected retrieval intent': retrievalPlan.strategy,
    'Retrieval strategy selected': retrievalPlan.strategy,
    'Reason for selecting that strategy': retrievalPlan.reason,
    'page=1 and per_page=25 treated as Copilot defaults or explicit user pagination': paginationInterpretation.interpretation,
    'fetchAll=true or false': retrievalPlan.fetchAll,
    'Copilot defaults applied': paginationInterpretation.copilotDefaultsApplied,
    'Explicit pagination requested': paginationInterpretation.explicitPaginationRequested,
  });
}

async function getRecords(moduleKey, options = {}) {
  const normalizedKey = normalizeModuleKey(moduleKey);
  const moduleDefinition = getModuleDefinition(normalizedKey);
  const retrievalPlan = getRetrievalPlan(moduleDefinition, options);
  const effectiveOptions = {
    ...options,
    ...retrievalPlan.params,
  };
  const {
    page,
    per_page,
    ids,
    fields: requestedFields,
  } = effectiveOptions;
  const shouldFetchAllPages = retrievalPlan.fetchAll;
  logPlannerDebug(normalizedKey, options, retrievalPlan, moduleDefinition);
  logRetrievalPlan(normalizedKey, options, retrievalPlan);
  console.debug('[Zoho CRM] Retrieval mode decision', {
    module: normalizedKey,
    'retrieval_mode received': normalizeRetrievalMode(options.retrieval_mode ?? options.retrievalMode),
    'retrieval strategy selected': retrievalPlan.strategy,
  });

  if (retrievalPlan.strategy === RETRIEVAL_STRATEGIES.COUNT) {
    try {
      return await executeCountRequest(normalizedKey, moduleDefinition, options);
    } catch (error) {
      logRequestError(
        error,
        normalizedKey,
        moduleDefinition,
        error?.config?.params || {},
        []
      );
      throw error;
    }
  }

  if (normalizedKey === 'users') {
    console.debug('[Zoho CRM] Calling Users API');

    try {
      const params = {
        type: 'AllUsers',
        ids: ids || undefined,
      };

      if (shouldFetchAllPages) {
        let pagesFetched = 0;
        const responseData = await fetchAllPages({
          moduleKey: normalizedKey,
          dataKey: 'users',
          baseParams: params,
          fetchPage: async (pageParams) => {
            const response = await zohoClient.get('/crm/v8/users', { params: pageParams });
            return response.data;
          },
          onPageFetched: () => { pagesFetched += 1; },
        });

        logRetrievalComplete(normalizedKey, pagesFetched, responseData.users?.length || 0);

        return {
          data: responseData.users || [],
          info: responseData.info || {},
        };
      }

      const response = await zohoClient.get('/crm/v8/users', {
        params: {
          ...params,
          page: Number(page || 1),
          per_page: Number(per_page || DEFAULT_PER_PAGE),
        },
      });

      logRetrievalComplete(normalizedKey, 1, response.data.users?.length || 0);

      return {
        data: response.data.users || [],
        info: response.data.info || {},
      };
    } catch (error) {
      console.error('[Zoho CRM] Users API Error', {
        status: error.response?.status,
        data: error.response?.data,
      });

      throw error;
    }
  }

  const { params, fields: responseFields } = buildQueryParams(normalizedKey, effectiveOptions);

  logRequestDebug(normalizedKey, moduleDefinition, params, responseFields);

  try {
    if (shouldFetchAllPages) {
      let pagesFetched = 0;
      let totalRecords = 0;
      const result = await fetchAllPages({
        moduleKey: normalizedKey,
        baseParams: params,
        fetchPage: async (pageParams) => {
          const response = await zohoClient.get(
            `/crm/v8/${moduleDefinition.endpoint}`,
            { params: pageParams }
          );

          return response.data;
        },
        onPageFetched: ({ recordsFetched }) => {
          pagesFetched += 1;
          totalRecords += recordsFetched;
        },
      });

      logRetrievalComplete(normalizedKey, pagesFetched, totalRecords);
      return result;
    }

    const response = await zohoClient.get(
      `/crm/v8/${moduleDefinition.endpoint}`,
      { params }
    );

    logRetrievalComplete(normalizedKey, 1, response.data?.data?.length || response.data?.users?.length || 0);

    return response.data;
  } catch (error) {
    logRequestError(
      error,
      normalizedKey,
      moduleDefinition,
      error?.config?.params || params,
      requestedFields
    );
    throw error;
  }
}

module.exports = {
  getRecords,
};
