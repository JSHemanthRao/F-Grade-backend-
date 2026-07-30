function createResponseEnvelope(data, meta = {}) {
  return {
    data,
    meta,
  };
}

function createErrorEnvelope(message, details = null) {
  return {
    error: {
      message,
      details,
    },
  };
}

module.exports = {
  createErrorEnvelope,
  createResponseEnvelope,
};
