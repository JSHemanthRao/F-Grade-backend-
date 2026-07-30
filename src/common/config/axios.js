const axios = require('axios');
const {
  ZOHO_API_DOMAIN,
  ZOHO_API_TIMEOUT_MS,
} = require('./env');
const { getAuthorizationHeader } = require('../auth/auth.service');

const zohoClient = axios.create({
  baseURL: ZOHO_API_DOMAIN,
  timeout: ZOHO_API_TIMEOUT_MS,
});

zohoClient.interceptors.request.use(async (config) => {
  const authorizationHeader = await getAuthorizationHeader();

  config.headers = {
    ...(config.headers || {}),
    Authorization: authorizationHeader,
  };

  return config;
});

module.exports = {
  zohoClient,
};
