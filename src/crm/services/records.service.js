const { zohoClient } = require('../../common/config/axios');
const { NODE_ENV } = require('../../common/config/env');
const { getModuleDefinition } = require('./module-definition.service');

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
    filters,
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

  if (filters !== undefined && filters !== null && filters !== '') {
    params.criteria = typeof filters === 'string' ? filters : JSON.stringify(filters);
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

async function getRecords(moduleKey, options = {}) {
  const {
    page,
    per_page,
    ids,
    fields: requestedFields,
    filters,
  } = options;
  const normalizedKey = normalizeModuleKey(moduleKey);
  const moduleDefinition = getModuleDefinition(normalizedKey);

  if (normalizedKey === 'users') {
    console.debug('[Zoho CRM] Calling Users API');

    try {
      const response = await zohoClient.get('/crm/v8/users', {
        params: {
          type: 'AllUsers',
          page: Number(page || 1),
          per_page: Number(per_page || 200),
          ids: ids || undefined,
        },
      });

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

  const { params, fields: responseFields } = buildQueryParams(normalizedKey, options);

  logRequestDebug(normalizedKey, moduleDefinition, params, responseFields);

  try {
    const response = await zohoClient.get(
      `/crm/v8/${moduleDefinition.endpoint}`,
      { params }
    );

    return response.data;
  } catch (error) {
    logRequestError(error, normalizedKey, moduleDefinition, params, requestedFields);
    throw error;
  }
}

module.exports = {
  getRecords,
};
