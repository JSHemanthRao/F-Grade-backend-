const axios = require('axios');
const { getAccessToken } = require('./auth.service');
const { API_DOMAIN } = require('../config/env');

const PEOPLE_API_BASE_URL = process.env.ZOHO_PEOPLE_API_DOMAIN || `${API_DOMAIN}/people/v1`;

async function makePeopleRequest(path, params = null) {
  const accessToken = await getAccessToken();
  const url = new URL(path.startsWith('http') ? path : `${PEOPLE_API_BASE_URL}/${path.replace(/^\/+/, '')}`);

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
      'Failed to communicate with Zoho People.'
    );
  }
}

async function getEmployees() {
  return makePeopleRequest('employees');
}

async function getEmployeeById(employeeId) {
  return makePeopleRequest(`employees/${employeeId}`);
}

async function getDepartments() {
  return makePeopleRequest('departments');
}

async function getDesignations() {
  return makePeopleRequest('designations');
}

async function getAttendanceRecords(params = null) {
  return makePeopleRequest('attendance', params);
}

async function getLeaveRequests(params = null) {
  return makePeopleRequest('leave_requests', params);
}

async function getHolidays(params = null) {
  return makePeopleRequest('holidays', params);
}

async function getShifts(params = null) {
  return makePeopleRequest('shifts', params);
}

module.exports = {
  getEmployees,
  getEmployeeById,
  getDepartments,
  getDesignations,
  getAttendanceRecords,
  getLeaveRequests,
  getHolidays,
  getShifts,
};
