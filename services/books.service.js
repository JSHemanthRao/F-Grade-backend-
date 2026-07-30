const axios = require('axios');
const { getAccessToken } = require('./auth.service');
const { API_DOMAIN } = require('../config/env');

const BOOKS_API_BASE_URL = process.env.ZOHO_BOOKS_API_DOMAIN || `${API_DOMAIN}/books/v3`;

async function makeBooksRequest(path, method = 'get', data = null, params = null) {
  const accessToken = await getAccessToken();
  const url = new URL(path.startsWith('http') ? path : `${BOOKS_API_BASE_URL}/${path.replace(/^\/+/, '')}`);

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
      'Failed to communicate with Zoho Books.'
    );
  }
}

async function getCustomers() {
  return makeBooksRequest('customers');
}

async function getCustomerById(customerId) {
  return makeBooksRequest(`customers/${customerId}`);
}

async function getInvoices() {
  return makeBooksRequest('invoices');
}

async function getInvoiceById(invoiceId) {
  return makeBooksRequest(`invoices/${invoiceId}`);
}

async function getEstimates() {
  return makeBooksRequest('estimates');
}

async function getSalesOrders() {
  return makeBooksRequest('salesorders');
}

async function getPurchaseOrders() {
  return makeBooksRequest('purchaseorders');
}

async function getBills() {
  return makeBooksRequest('bills');
}

async function getVendors() {
  return makeBooksRequest('vendors');
}

async function getItems() {
  return makeBooksRequest('items');
}

async function getPayments() {
  return makeBooksRequest('payments');
}

async function getContacts() {
  return makeBooksRequest('contacts');
}

module.exports = {
  getCustomers,
  getCustomerById,
  getInvoices,
  getInvoiceById,
  getEstimates,
  getSalesOrders,
  getPurchaseOrders,
  getBills,
  getVendors,
  getItems,
  getPayments,
  getContacts,
};
