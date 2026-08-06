const { DEBUG_ASSISTANT } = require('../../../common/config/env');

const INTENT_ORDER = ['CONVERSION', 'COUNT', 'LIST', 'SEARCH', 'FILTER', 'COMPARE', 'SUMMARY', 'ANALYTICS', 'AGGREGATION', 'EXPLAIN'];

const INTENT_PATTERNS = {
  CONVERSION: [/(converted|conversion|converted\s+into|converted\s+to|lead\s+conversion|qualified|became\s+a\s+deal)/i],
  COUNT: [/(how many|number of|count|total)/i],
  LIST: [/(show|list|display|view|give me|find)/i],
  SEARCH: [/(search|find|lookup|look for)/i],
  FILTER: [/(where|with|only|for|from|belonging to)/i],
  COMPARE: [/(compare|versus|vs|difference|difference between|better than|worse than)/i],
  SUMMARY: [/(summary|overview|snapshot|report)/i],
  ANALYTICS: [/(analytics|trend|distribution|performance|top|bottom|ranking|leader|owner)/i],
  AGGREGATION: [/(sum|average|total value|total revenue|revenue|amount|deal value|median|percentage|growth|rate)/i],
  EXPLAIN: [/(why|explain|reason|cause)/i],
};

function logIntentDebug(question, normalizedQuestion, matchedKeywords, detectedIntents, confidence) {
  if (!DEBUG_ASSISTANT) {
    return;
  }

  console.info('[CRM Assistant][Intent Detector]', {
    originalQuestion: question,
    normalizedQuestion,
    matchedKeywords,
    detectedIntent: detectedIntents,
    confidence,
  });
}

function detectIntents(question) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();
  const detected = [];
  const matchedKeywords = [];

  try {
    INTENT_ORDER.forEach((intent) => {
      const matches = INTENT_PATTERNS[intent].filter((pattern) => pattern.test(normalizedQuestion));
      if (matches.length > 0) {
        detected.push(intent);
        matchedKeywords.push({ intent, keywords: INTENT_PATTERNS[intent].map((pattern) => pattern.toString()) });
      }
    });
  } catch (error) {
    if (DEBUG_ASSISTANT) {
      console.error('[CRM Assistant][Intent Detector] Error', error);
    }
  }

  const finalIntents = detected.length > 0 ? detected : ['SUMMARY'];
  logIntentDebug(question, normalizedQuestion, matchedKeywords, finalIntents, finalIntents.length > 0 ? 'high' : 'low');

  return finalIntents;
}

module.exports = {
  detectIntents,
};
