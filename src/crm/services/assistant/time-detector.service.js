const { DEBUG_ASSISTANT } = require('../../../common/config/env');

function detectTimeRange(question) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();
  const detectedKeywords = [];

  if (/today/.test(normalizedQuestion)) detectedKeywords.push('today');
  if (/yesterday/.test(normalizedQuestion)) detectedKeywords.push('yesterday');
  if (/this week/.test(normalizedQuestion)) detectedKeywords.push('this week');
  if (/last week/.test(normalizedQuestion)) detectedKeywords.push('last week');
  if (/this month/.test(normalizedQuestion)) detectedKeywords.push('this month');
  if (/last month/.test(normalizedQuestion)) detectedKeywords.push('last month');
  if (/this quarter/.test(normalizedQuestion)) detectedKeywords.push('this quarter');
  if (/last quarter/.test(normalizedQuestion)) detectedKeywords.push('last quarter');
  if (/this year/.test(normalizedQuestion)) detectedKeywords.push('this year');
  if (/last year/.test(normalizedQuestion)) detectedKeywords.push('last year');
  if (/last 30 days/.test(normalizedQuestion)) detectedKeywords.push('last 30 days');
  const rollingMonths = normalizedQuestion.match(/last\s+(\d+)\s+months?/);
  if (rollingMonths) detectedKeywords.push(`last ${rollingMonths[1]} months`);
  if (/last year/.test(normalizedQuestion)) detectedKeywords.push('last year');
  const namedMonth = normalizedQuestion.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (namedMonth) detectedKeywords.push(namedMonth[1]);
  if (/(?:between|from)\s+.+\s+(?:and|to)\s+.+/.test(normalizedQuestion)) detectedKeywords.push('custom date range');

  const result = detectedKeywords.length > 0
    ? { label: detectedKeywords[0], range: detectedKeywords[0].replace(/\s+/g, '_') }
    : { label: 'all time', range: 'all_time' };

  if (DEBUG_ASSISTANT) {
    console.info('[CRM Assistant][Time Detector]', {
      originalQuestion: question,
      detectedTimeKeywords: detectedKeywords,
      resolvedStartDate: null,
      resolvedEndDate: null,
      result,
    });
  }

  return result;
}

module.exports = {
  detectTimeRange,
};
