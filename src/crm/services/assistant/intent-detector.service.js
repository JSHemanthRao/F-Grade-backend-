const INTENT_ORDER = ['COUNT', 'LIST', 'SEARCH', 'FILTER', 'COMPARE', 'SUMMARY', 'ANALYTICS', 'AGGREGATION', 'EXPLAIN'];

const INTENT_PATTERNS = {
  COUNT: [/(how many|number of|count|total)/i],
  LIST: [/(show|list|display|view|give me|find)/i],
  SEARCH: [/(search|find|lookup|look for)/i],
  FILTER: [/(where|with|only|for|from|belonging to)/i],
  COMPARE: [/(compare|versus|vs|difference|difference between|better than|worse than)/i],
  SUMMARY: [/(summary|overview|snapshot|report)/i],
  ANALYTICS: [/(analytics|trend|distribution|performance|top|bottom|ranking|leader|owner)/i],
  AGGREGATION: [/(sum|average|total value|total revenue|median|percentage|growth|rate)/i],
  EXPLAIN: [/(why|explain|reason|cause)/i],
};

function detectIntents(question) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();
  const detected = [];

  INTENT_ORDER.forEach((intent) => {
    if (INTENT_PATTERNS[intent].some((pattern) => pattern.test(normalizedQuestion))) {
      detected.push(intent);
    }
  });

  return detected.length > 0 ? detected : ['SUMMARY'];
}

module.exports = {
  detectIntents,
};
