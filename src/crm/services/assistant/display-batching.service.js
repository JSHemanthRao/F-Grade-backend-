const DISPLAY_LIMIT = 25;

function createDisplayState(records = [], offset = 0) {
  const matchingRecords = Array.isArray(records) ? records : [];
  const start = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  return {
    matchingRecords,
    offset: Math.min(start, matchingRecords.length),
  };
}

function getDisplayBatch(state, limit = DISPLAY_LIMIT) {
  const matchingRecords = Array.isArray(state?.matchingRecords) ? state.matchingRecords : [];
  const batchSize = Number.isInteger(limit) && limit > 0 ? limit : DISPLAY_LIMIT;
  const start = Number.isInteger(state?.offset) && state.offset >= 0 ? state.offset : 0;
  const end = Math.min(start + batchSize, matchingRecords.length);

  return {
    records: matchingRecords.slice(start, end),
    start,
    end,
    total: matchingRecords.length,
    remaining: Math.max(0, matchingRecords.length - end),
    nextState: { matchingRecords, offset: end },
  };
}

function isDisplayContinuation(question = '') {
  return /\b(?:show\s+more|remaining|next|continue|show\s+the\s+rest|show\s+rest|show\s+(?:those|them|the\s+same)|(?:those|them|same\s+records))\b/i.test(String(question));
}

module.exports = {
  DISPLAY_LIMIT,
  createDisplayState,
  getDisplayBatch,
  isDisplayContinuation,
};