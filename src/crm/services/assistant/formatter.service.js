const { DEBUG_ASSISTANT } = require('../../../common/config/env');
const {
  FALLBACK_REASONS,
  chooseFallback,
  logFallbackReason,
} = require('./fallback-engine.service');

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
      tables: [],
      calculations: leadCount !== undefined && dealCount !== undefined
        ? [{ label: 'New leads', type: 'fallback_leads_created', value: leadCount }, { label: 'New deals', type: 'fallback_deals_created', value: dealCount }]
        : [],
      insights: [],
      limitations: [],
      followUpQuestions: [],
    };
  }
  const emptyReason = options.emptyReason || FALLBACK_REASONS.EMPTY_RESULT;
  const seenIds = new Set();
  const data = datasets.flatMap((dataset) => dataset?.result?.data || dataset?.data || [])
    .filter((record) => {
      const id = record?.id ?? record?.ID;
      if (id === undefined || id === null) return true;
      const key = String(id);
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      return true;
    });
  if (calculations.some((calculation) => calculation.type === 'conversion_unavailable')) {
    return formatResponse(plan, datasets, [], { emptyReason: 'UNSUPPORTED_METRIC' });
  }
  if (options.limitation) {
    return {
      success: true,
      summary: options.closestAnswer || 'The CRM could not complete the requested analysis.',
      requestedInformation: plan.question,
      data,
      tables: [],
      calculations,
      insights: options.insights || [],
      limitations: [options.limitation],
      followUpQuestions: [],
    };
  }
  if (data.length === 0 && !calculations.some((calculation) => (
    (calculation.type === 'count' && calculation.value > 0)
    || (calculation.type === 'counts' && Object.values(calculation.value).some((value) => value > 0))
  ))) {
    logFallbackReason(emptyReason);
    const fallback = chooseFallback({
      closestAnswer: options.closestAnswer,
      clarifyingQuestion: options.clarifyingQuestion,
      reason: emptyReason,
    });
    return { success: true, summary: fallback.answer, requestedInformation: plan.question, data: [], tables: [], calculations: [], insights: [], limitations: [], followUpQuestions: [] };
  }
  const count = calculations.find((calculation) => calculation.type === 'count');
  const counts = calculations.find((calculation) => calculation.type === 'counts');
  const sum = calculations.find((calculation) => calculation.type === 'sum');
  const average = calculations.find((calculation) => calculation.type === 'average');
  const comparison = calculations.find((calculation) => calculation.type === 'comparison');
  const multiModuleComparison = calculations.find((calculation) => calculation.type === 'multi_module_comparison');
  const monthlyPerformance = calculations.find((calculation) => calculation.type === 'monthly_performance');
  const conversionCount = calculations.find((calculation) => calculation.type === 'conversion_count');
  const conversionRate = calculations.find((calculation) => calculation.type === 'conversion_rate');
  const stageDistribution = calculations.find((calculation) => calculation.type === 'stage_distribution');
  const pipeline = calculations.find((calculation) => calculation.type === 'pipeline');
  const currentMonthLabel = plan.timeRange?.includesCurrentMonth ? 'Current Month (Month-to-Date): ' : '';
  const crmReturnedDate = datasets.flatMap((dataset) => [dataset?.result?.info, dataset?.info])
    .map((info) => info && (
      info.data_available_through
      || info.dataAvailableThrough
      || info.available_through
      || info.availableThrough
      || info.through_date
      || info.throughDate
      || info.cutoff_date
      || info.cutoffDate
      || info.as_of_date
      || info.asOfDate
    ))
    .find((value) => value !== undefined && value !== null && value !== '');
  const summary = conversionRate ? `CRM lead conversion rate: ${(conversionRate.value * 100).toFixed(2)}%.`
    : conversionCount ? `${conversionCount.value} converted CRM leads found.`
    : pipeline ? `Pipeline value: ${pipeline.value}.`
    : stageDistribution ? `Stage distribution: ${Object.entries(stageDistribution.value).map(([stage, value]) => `${stage} ${value}`).join(', ')}.`
    : monthlyPerformance ? `${monthlyPerformance.value.includesCurrentMonth ? currentMonthLabel : ''}Monthly CRM performance: ${Object.entries(monthlyPerformance.value.monthlyTotals).map(([month, value]) => `${month} ${value}`).join(', ')}${monthlyPerformance.value.growth === null ? '.' : `; latest month-over-month growth ${(monthlyPerformance.value.growth * 100).toFixed(2)}%.`}`
    : multiModuleComparison ? `CRM comparison completed for ${Object.entries(multiModuleComparison.value).map(([module, values]) => `${module}: this month ${values['this month']}, last month ${values['last month']}, difference ${values.difference}`).join('; ')}.`
    : comparison ? `CRM comparison: this month ${comparison.value['this month']}, last month ${comparison.value['last month']}, difference ${comparison.value.difference}.`
    : average ? `Average CRM deal value: ${average.value}.`
      : sum ? `Total CRM value: ${sum.value}.`
    : counts ? `CRM counts: ${Object.entries(counts.value).map(([module, value]) => `${module} ${value}`).join(', ')}.`
      : count ? `${count.value} matching records found in CRM.`
          : `${currentMonthLabel}${data.length} CRM records returned.`;
  const labeledSummary = currentMonthLabel && !monthlyPerformance ? `${currentMonthLabel}${summary}` : summary;
  const summaryWithAvailability = crmReturnedDate ? `${labeledSummary} Data available through ${crmReturnedDate}.` : labeledSummary;
  const response = {
    success: true,
    summary: summaryWithAvailability,
    requestedInformation: plan.question,
    data,
    tables: [],
    calculations,
    insights: options.insights || [],
    limitations: [],
    followUpQuestions: [
      'Which owner, segment, or region should be included in the next analysis?',
      'What period should be used for the next business comparison?',
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
