const { DEBUG_ASSISTANT } = require('../../../common/config/env');

function detectTimeRange(question) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();
  const detectedKeywords = [];

  if (/today/.test(normalizedQuestion)) detectedKeywords.push('today');
  if (/yesterday/.test(normalizedQuestion)) detectedKeywords.push('yesterday');
  if (/this week/.test(normalizedQuestion)) detectedKeywords.push('this week');
  if (/last week/.test(normalizedQuestion)) detectedKeywords.push('last week');
  if (/this month|current month|month[-\s]+to[-\s]+date/.test(normalizedQuestion)) detectedKeywords.push('this month');
  if (/last month|previous month/.test(normalizedQuestion)) detectedKeywords.push('last month');
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

  const label = detectedKeywords[0];
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  const namedMonthIndex = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(label);
  const namedMonthIsCurrent = namedMonthIndex >= 0 && namedMonthIndex === currentMonth;
  const isCurrentMonth = label === 'this month';
  const isHistoricalRange = Boolean(label && !isCurrentMonth && !namedMonthIsCurrent);
  const result = label
    ? {
      label,
      range: label.replace(/\s+/g, '_'),
      includesCurrentMonth: isCurrentMonth || namedMonthIsCurrent,
      historicalOnly: isHistoricalRange,
      ...(rollingMonths ? { monthCount: Number(rollingMonths[1]) } : {}),
      ...(namedMonthIndex >= 0 ? { year: currentYear } : {}),
    }
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
