const { DEBUG_ASSISTANT } = require('../../../common/config/env');

function formatResponse(plan, datasets, calculations, options = {}) {
  if (options.conversionFallback) {
    const { period, leadCount, dealCount } = options.conversionFallback;
    const fallbackSummary = leadCount !== undefined && dealCount !== undefined
      ? `I can't calculate lead conversions because the connected CRM doesn't expose that relationship. However, ${period} there were ${leadCount} new leads and ${dealCount} new deals.`
      : 'The connected CRM does not provide enough information to calculate lead conversions, and no reliable alternative metric was available.';
    return {
      success: true,
      summary: fallbackSummary,
      requestedInformation: plan.question,
      data: [],
      calculations: leadCount !== undefined && dealCount !== undefined
        ? [{ label: 'New leads', type: 'fallback_leads_created', value: leadCount }, { label: 'New deals', type: 'fallback_deals_created', value: dealCount }]
        : [],
      insights: [],
      limitations: [],
      followUpQuestions: [],
    };
  }
  const emptyReason = options.emptyReason || 'EMPTY_RESULT';
  if (DEBUG_ASSISTANT && (datasets.length === 0 || calculations.length === 0)) {
    console.info('[CRM Assistant][Fallback Decision]', { reason: emptyReason });
  }
  if (emptyReason === 'UNSUPPORTED_METRIC' || emptyReason === 'INSUFFICIENT_DATA') {
    return {
      success: true,
      summary: "I couldn't calculate this metric because the connected CRM doesn't provide the required information.",
      requestedInformation: plan.question,
      data: [],
      calculations: [],
      insights: [],
      limitations: [],
      followUpQuestions: [],
    };
  }
  const data = datasets.flatMap((dataset) => dataset?.result?.data || dataset?.data || []);
  if (calculations.some((calculation) => calculation.type === 'conversion_unavailable')) {
    return formatResponse(plan, datasets, [], { emptyReason: 'UNSUPPORTED_METRIC' });
  }
  if (data.length === 0 && !calculations.some((calculation) => calculation.type === 'count' && calculation.value > 0)) {
    const summary = 'No matching CRM records were found for the requested period.';
    return { success: true, summary, requestedInformation: plan.question, data: [], calculations: [], insights: [], limitations: [], followUpQuestions: [] };
  }
  const count = calculations.find((calculation) => calculation.type === 'count');
  const sum = calculations.find((calculation) => calculation.type === 'sum');
  const average = calculations.find((calculation) => calculation.type === 'average');
  const comparison = calculations.find((calculation) => calculation.type === 'comparison');
  const conversionCount = calculations.find((calculation) => calculation.type === 'conversion_count');
  const conversionRate = calculations.find((calculation) => calculation.type === 'conversion_rate');
  const summary = conversionRate ? `CRM lead conversion rate: ${(conversionRate.value * 100).toFixed(2)}%.`
    : conversionCount ? `${conversionCount.value} converted CRM leads found.`
    : comparison ? `CRM comparison: this month ${comparison.value['this month']}, last month ${comparison.value['last month']}, difference ${comparison.value.difference}.`
    : average ? `Average CRM deal value: ${average.value}.`
      : sum ? `Total CRM value: ${sum.value}.`
        : count ? `${count.value} matching records found in CRM.`
          : `${data.length} CRM records returned.`;
  const response = {
    success: true,
    summary,
    requestedInformation: plan.question,
    data,
    calculations,
    insights: [],
    limitations: [],
    followUpQuestions: [
      `Would you like a breakdown by ${plan.modules[0]} owner?`,
      'Would you like this view extended to the previous period?',
    ],
  };

  if (DEBUG_ASSISTANT) {
    console.info('[CRM Assistant][Formatter] ↓', {
      summary,
      requestedInformation: plan.question,
      calculations,
      limitations: response.limitations,
      followUpQuestions: response.followUpQuestions,
    });
  }

  return response;
}

module.exports = {
  formatResponse,
};
