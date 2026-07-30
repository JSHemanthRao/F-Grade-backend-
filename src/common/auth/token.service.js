const DEFAULT_EXPIRES_IN_SECONDS = 3600;
const EXPIRY_BUFFER_MS = 60000;

let tokenState = {
  accessToken: null,
  expiresAt: 0,
};

function setAccessToken(accessToken, expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS) {
  const ttlSeconds = Number(expiresInSeconds);
  const safeTtlSeconds = Number.isFinite(ttlSeconds) && ttlSeconds > 0
    ? ttlSeconds
    : DEFAULT_EXPIRES_IN_SECONDS;

  tokenState = {
    accessToken,
    expiresAt: Date.now() + safeTtlSeconds * 1000,
  };
}

function getAccessToken() {
  if (!tokenState.accessToken) {
    return null;
  }

  if (Date.now() + EXPIRY_BUFFER_MS >= tokenState.expiresAt) {
    return null;
  }

  return tokenState.accessToken;
}

function clearAccessToken() {
  tokenState = {
    accessToken: null,
    expiresAt: 0,
  };
}

module.exports = {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
};
