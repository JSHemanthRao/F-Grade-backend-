const axios = require('axios');
const { getAccessToken } = require('./auth.service');
const { API_DOMAIN } = require('../config/env');

const INVENTORY_API_BASE_URL = process.env.ZOHO_INVENTORY_API_DOMAIN || `${API_DOMAIN}/inventory/v1`;

async function makeInventoryRequest(path, method = 'get', data = null, params = null) {
  const accessToken = await getAccessToken();
  const url = new URL(path.startsWith('http') ? path : `${INVENTORY_API_BASE_URL}/${path.replace(/^\/+/, '')}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  try {
    const config = {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    };

    if (method === 'get') {
      const response = await axios.get(url.toString(), config);
      return response.data;
    }

    if (method === 'post') {
      const response = await axios.post(url.toString(), data, config);
      return response.data;
    }

    throw new Error(`Unsupported HTTP method: ${method}`);
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to communicate with Zoho Inventory.'
    );
  }
}

async function getItems() {
  return makeInventoryRequest('items');
}

async function getItemById(itemId) {
  return makeInventoryRequest(`items/${itemId}`);
}

async function getWarehouses() {
  return makeInventoryRequest('warehouses');
}

async function getSalesOrders() {
  return makeInventoryRequest('salesorders');
}

async function getPurchaseOrders() {
  return makeInventoryRequest('purchaseorders');
}

async function getPackages() {
  return makeInventoryRequest('packages');
}

async function getShipments() {
  return makeInventoryRequest('shipments');
}

async function getCompositeItems() {
  return makeInventoryRequest('compositeitems');
}

async function getContacts() {
  return makeInventoryRequest('contacts');
}

module.exports = {
  getItems,
  getItemById,
  getWarehouses,
  getSalesOrders,
  getPurchaseOrders,
  getPackages,
  getShipments,
  getCompositeItems,
  getContacts,
};
