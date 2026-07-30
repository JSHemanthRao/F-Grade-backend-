const axios = require('axios');
const { getAccessToken } = require('./auth.service');
const { API_DOMAIN } = require('../config/env');

const ANALYTICS_API_BASE_URL = process.env.ZOHO_ANALYTICS_API_DOMAIN || `${API_DOMAIN}/analytics/v2`;

async function makeAnalyticsRequest(path, params = null) {
  const accessToken = await getAccessToken();
  const url = new URL(path.startsWith('http') ? path : `${ANALYTICS_API_BASE_URL}/${path.replace(/^\/+/, '')}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  try {
    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to communicate with Zoho Analytics.'
    );
  }
}

async function getWorkspaces() {
  return makeAnalyticsRequest('workspaces');
}

async function getViews(workspaceId) {
  return makeAnalyticsRequest(`workspaces/${workspaceId}/views`);
}

async function getTables(workspaceId) {
  return makeAnalyticsRequest(`workspaces/${workspaceId}/tables`);
}

async function getTableMetadata(workspaceId, tableId) {
  return makeAnalyticsRequest(`workspaces/${workspaceId}/tables/${tableId}`);
}

async function getTableData(workspaceId, tableId, params = null) {
  return makeAnalyticsRequest(`workspaces/${workspaceId}/tables/${tableId}/data`, params);
}

async function executeQuery(workspaceId, query, params = null) {
  return makeAnalyticsRequest(`workspaces/${workspaceId}/query`, { ...params, query });
}

module.exports = {
  getWorkspaces,
  getViews,
  getTables,
  getTableMetadata,
  getTableData,
  executeQuery,
};
