const axios = require('axios');
const { getAccessToken } = require('./auth.service');
const { API_DOMAIN } = require('../config/env');

const RENEWAL_ACCOUNTS_MODULE = 'Renewal_Accounts';
const RENEWAL_ACCOUNTS_FIELDS = ['Account_Name', 'Renewal_Date'];

const MODULE_FIELDS = {
  Leads: ['Last_Name', 'Company', 'Email'],
  Contacts: ['First_Name', 'Last_Name', 'Email', 'Phone'],
  Accounts: ['Account_Name', 'Phone', 'Website'],
  Deals: ['Deal_Name', 'Stage', 'Amount', 'Closing_Date'],
  Tasks: ['Subject', 'Status', 'Priority'],
  Events: ['Event_Title', 'Start_DateTime', 'End_DateTime'],
  Calls: ['Subject', 'Call_Start_Time'],
  Meetings: ['Event_Title', 'Start_DateTime'],
  Notes: ['Note_Title', 'Note_Content'],
  Products: ['Product_Name', 'Unit_Price'],
  Vendors: ['Vendor_Name', 'Phone'],
  Quotes: ['Subject', 'Grand_Total'],
  Sales_Orders: ['Subject', 'Grand_Total'],
  Purchase_Orders: ['Subject', 'Grand_Total'],
  Campaigns: ['Campaign_Name', 'Type', 'Status'],
  Cases: ['Subject', 'Status', 'Priority'],
  Solutions: ['Solution_Title', 'Status'],
  Users: ['full_name', 'email', 'role'],
  Renewal_Accounts: ['Account_Name', 'Renewal_Date'],
};

async function getRecords(moduleName, label, fieldsOverride = null) {
  const fields = Array.isArray(fieldsOverride) && fieldsOverride.length > 0
    ? fieldsOverride
    : MODULE_FIELDS[moduleName];

  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error(`No field mapping configured for Zoho module: ${moduleName}`);
  }

  const accessToken = await getAccessToken();
  const url = new URL(`${API_DOMAIN}/crm/v8/${moduleName}`);
  url.searchParams.set('fields', fields.join(','));

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
      JSON.stringify(error.response?.data) ||
      error.message ||
      `Failed to fetch ${label} from Zoho CRM.`
    );
  }
}

async function getLeads() {
  return getRecords('Leads', 'leads');
}

async function getContacts() {
  return getRecords('Contacts', 'contacts');
}

async function getAccounts() {
  return getRecords('Accounts', 'accounts');
}

async function getDeals() {
  return getRecords('Deals', 'deals');
}

async function getTasks() {
  return getRecords('Tasks', 'tasks');
}

async function getEvents() {
  return getRecords('Events', 'events');
}

async function getCalls() {
  return getRecords('Calls', 'calls');
}

async function getMeetings() {
  return getRecords('Meetings', 'meetings');
}

async function getNotes() {
  return getRecords('Notes', 'notes');
}

async function getProducts() {
  return getRecords('Products', 'products');
}

async function getVendors() {
  return getRecords('Vendors', 'vendors');
}

async function getQuotes() {
  return getRecords('Quotes', 'quotes');
}

async function getSalesOrders() {
  return getRecords('Sales_Orders', 'sales orders');
}

async function getPurchaseOrders() {
  return getRecords('Purchase_Orders', 'purchase orders');
}

async function getCampaigns() {
  return getRecords('Campaigns', 'campaigns');
}

async function getCases() {
  return getRecords('Cases', 'cases');
}

async function getSolutions() {
  return getRecords('Solutions', 'solutions');
}

async function getUsers() {
  const accessToken = await getAccessToken();

  const url = `${API_DOMAIN}/crm/v8/users?type=AllUsers`;

  console.log("================================");
  console.log("API_DOMAIN:", API_DOMAIN);
  console.log("Final URL:", url);
  console.log("================================");

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
  console.log("API_DOMAIN:", API_DOMAIN);
console.log("Final URL:", url);

    throw error;
  }
}

async function getRenewalAccounts() {
  return getRecords(RENEWAL_ACCOUNTS_MODULE, 'renewal accounts', RENEWAL_ACCOUNTS_FIELDS);
}

async function getOrg() {
  const accessToken = await getAccessToken();
  const url = new URL(`${API_DOMAIN}/crm/v8/org`);

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
      JSON.stringify(error.response?.data) ||
      error.message ||
      'Failed to fetch organization details from Zoho CRM.'
    );
  }
}

module.exports = {
  getLeads,
  getContacts,
  getAccounts,
  getDeals,
  getTasks,
  getEvents,
  getCalls,
  getMeetings,
  getNotes,
  getProducts,
  getVendors,
  getQuotes,
  getSalesOrders,
  getPurchaseOrders,
  getCampaigns,
  getCases,
  getSolutions,
  getUsers,
  getRenewalAccounts,
  getOrg,
};
