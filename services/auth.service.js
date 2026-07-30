require('dotenv').config();
const axios = require('axios');
const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, API_DOMAIN } = require('../config/env');

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !API_DOMAIN) {
    throw new Error('Missing Zoho OAuth credentials or API domain in environment variables.');
  }

  try {
    const response = await axios.post(
      'https://accounts.zoho.in/oauth/v2/token',
      new URLSearchParams({
        refresh_token: REFRESH_TOKEN,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.data || !response.data.access_token) {
      throw new Error('No access token returned from Zoho OAuth.');
    }

    return response.data.access_token;
  } catch (error) {
    const message = error.response?.data?.error_description || error.message || 'Failed to retrieve Zoho access token.';
    throw new Error(message);
  }
}

module.exports = {
  getAccessToken,
};
