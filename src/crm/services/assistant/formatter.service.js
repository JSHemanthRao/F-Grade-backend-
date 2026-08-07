const { DEBUG_ASSISTANT } = require('../../../common/config/env');
const {
  FALLBACK_REASONS,
  chooseFallback,
  logFallbackReason,
} = require('./fallback-engine.service');
const logger = require('../../../common/logging/logger');

const DATE_FIELDS = ['Closing_Date', 'Created_Time', 'CreatedDate', 'created_time', 'Created_Date', 'Modified_Time'];
const AVAILABILITY_FIELDS = [
  'data_available_through', 'dataAvailableThrough', 'available_through', 'availableThrough',
  'through_date', 'throughDate', 'cutoff_date', 'cutoffDate', 'as_of_date', 'asOfDate',
];

function recordsFrom(datasets) {
  const seen = new Set();
  return datasets.flatMap((dataset) => dataset?.result?.data || dataset?.data || []).filter((record) => {
    const id = record?.id ?? record?.ID;
    if (id === undefined || id === null) return true;
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function infoFrom(datasets) {
  return datasets.flatMap((dataset) => [dataset?.result?.info, dataset?.info]).filter(Boolean);
}

function crmReturnedDate(datasets) {
  return infoFrom(datasets)
    .map((info) => AVAILABILITY_FIELDS.map((field) => info[field]).find((value) => value !== undefined && value !== null && value !== ''))
    .find(Boolean) || null;
}

function retrievalComplete(datasets) {
  return datasets.length > 0 && datasets.every((dataset) => {
    const info = dataset?.result?.info || dataset?.info || {};
    return info.more_records === false || info.retrievalComplete === true;
  });
}

function monthKey(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 7) : null;
}

function requestedMonths(plan) {
  const range = plan.timeRange || {};
  const now = new Date();
  if (range.monthCount) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - range.monthCount, 1));
    return Array.from({ length: range.monthCount }, (_, index) => new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1)).toISOString().slice(0, 7));
  }
  if (range.range === 'this_month' || range.range === 'last_month') {
    const offset = range.range === 'last_month' ? -1 : 0;
    return [new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString().slice(0, 7)];
  }
  const namedMonth = /^(january|february|march|april|may|june|july|august|september|october|november|december)$/.test(range.label || '');
  if (namedMonth) {
    const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(range.label);
    return [new Date(Date.UTC(range.year || now.getUTCFullYear(), month, 1)).toISOString().slice(0, 7)];
  }
  return [];
}

function buildCoverage(plan, datasets, records) {
  const requested = requestedMonths(plan);
  const dataMonths = [...new Set(records.flatMap((record) => DATE_FIELDS.map((field) => monthKey(record[field])).filter(Boolean)))].sort();
  const monthsWithData = requested.length ? requested.filter((month) => dataMonths.includes(month)) : dataMonths;
  const monthsWithoutData = requested.length && (records.length === 0 || dataMonths.length > 0)
    ? requested.filter((month) => !monthsWithData.includes(month))
    : [];
  const returnedThrough = crmReturnedDate(datasets);
  const complete = retrievalComplete(datasets) && !returnedThrough;
  const coverage = returnedThrough
    ? `Data available through ${returnedThrough}.`
    : complete
      ? 'CRM records cover the requested query.'
      : 'Coverage for the full requested period could not be confirmed.';

  return {
    requestedPeriod: plan.timeRange?.label || 'the requested period',
    retrievedDataCoverage: coverage,
    monthsWithData,
    monthsWithoutRetrievedRecords: monthsWithoutData,
    complete,
  };
}

function hasAmount(record) {
  const value = record?.Amount ?? record?.amount ?? record?.value ?? record?.Grand_Total;
  return value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
}

function metricSummary(calculations, dataLength) {
  const conversionRate = calculations.find((item) => item.type === 'conversion_rate');
  const conversionCount = calculations.find((item) => item.type === 'conversion_count');
  const pipeline = calculations.find((item) => item.type === 'pipeline');
  const stageDistribution = calculations.find((item) => item.type === 'stage_distribution');
  const monthly = calculations.find((item) => item.type === 'monthly_performance');
  const comparison = calculations.find((item) => item.type === 'comparison');
  const multi = calculations.find((item) => item.type === 'multi_module_comparison');
  const sum = calculations.find((item) => item.type === 'sum');
  const average = calculations.find((item) => item.type === 'average');
  const count = calculations.find((item) => item.type === 'count');
  const counts = calculations.find((item) => item.type === 'counts');

  if (conversionRate) return `Lead conversion rate: ${(conversionRate.value * 100).toFixed(2)}%.`;
  if (conversionCount) return `${conversionCount.value} converted leads.`;
  if (pipeline) return `Pipeline value: ${pipeline.value}.`;
  if (stageDistribution) return `Stage distribution: ${Object.entries(stageDistribution.value).map(([stage, value]) => `${stage} ${value}`).join(', ')}.`;
  if (monthly) return `Monthly values: ${Object.entries(monthly.value.monthlyTotals).map(([month, value]) => `${month} ${value}`).join(', ')}.`;
  if (multi) return `comparison: ${Object.entries(multi.value).map(([module, values]) => `${module}: this month ${values['this month']}, last month ${values['last month']}, difference ${values.difference}`).join('; ')}.`;
  if (comparison) return `comparison: this month ${comparison.value['this month']}; last month ${comparison.value['last month']}; difference ${comparison.value.difference}.`;
  if (average) return `Average deal value: ${average.value}.`;
  if (sum) return `Total value: ${sum.value}.`;
  if (counts) return `Record counts: ${Object.entries(counts.value).map(([module, value]) => `${module} ${value}`).join(', ')}.`;
  if (count) return `${count.value} matching ${Number(count.value) === 1 ? 'record' : 'records'}.`;
  return `${dataLength} ${dataLength === 1 ? 'record' : 'records'}.`;
}

function ownerName(record) {
  const owner = record?.Owner || record?.Owner_Name || record?.owner;
  if (typeof owner === 'string') return owner;
  return owner?.name || owner?.Name || owner?.full_name || null;
}

function dataBackedFollowUps(records, coverage) {
  const questions = [];
  const owners = [...new Set(records.map(ownerName).filter(Boolean))];
  const hasAmounts = records.some(hasAmount);
  if (owners.length > 0) questions.push(`Compare records by owner: ${owners.slice(0, 3).join(', ')}.`);
  if (coverage.monthsWithData.length > 1) questions.push(`Compare record counts across ${coverage.monthsWithData.join(', ')}.`);
  if (hasAmounts && questions.length < 2) questions.push('Show records with recorded amounts.');
  return questions.slice(0, 2);
}

function buildTables(records) {
  if (records.length === 0) return [];
  const columns = [...new Set(records.flatMap((record) => Object.keys(record || {})))]
    .filter((column) => !column.startsWith('_'))
    .slice(0, 12);
  return [{
    title: 'CRM Records',
    columns,
    rows: records.map((record) => columns.map((column) => record[column] ?? null)),
  }];
}

const FACTUAL_OBSERVATION_TYPES = new Set([
  'highest_value',
  'lowest_value',
  'top_performer',
  'bottom_performer',
  'increase',
  'decrease',
]);

function factualObservations(observations) {
  return (Array.isArray(observations) ? observations : [])
    .filter((observation) => observation
      && FACTUAL_OBSERVATION_TYPES.has(observation.type)
      && typeof observation.message === 'string'
      && !/approx\.?|around|roughly|approximately|~|latest records|retrieved dataset|first page|pagination|backend|api|connector|surged|strong momentum|healthy growth|pipeline remains strong/i.test(observation.message))
    .map((observation) => ({ type: observation.type, message: observation.message }));
}

function formatResponse(plan, datasets, calculations, options = {}) {
  const records = recordsFrom(datasets);
  const coverage = buildCoverage(plan, datasets, records);
  const currentMonthLabel = plan.timeRange?.includesCurrentMonth ? 'Current Month (Month-to-Date): ' : '';
  const conversionUnavailable = Boolean(options.conversionFallback) || calculations.some((calculation) => calculation.type === 'conversion_unavailable');
  const limitations = [];
  if (options.limitation) limitations.push(options.limitation);
  if (!coverage.complete && coverage.requestedPeriod !== 'the requested period') limitations.push('Available CRM data does not cover the entire requested period.');
  if (requestedMonths(plan).length > 0 && records.length > 0 && coverage.monthsWithData.length === 0) limitations.push('Available CRM records do not contain a usable date field for month coverage.');

  if (conversionUnavailable) {
    limitations.push('Lead conversion cannot be calculated because the required conversion fields were not available in the CRM records.');
    calculations = calculations.filter((calculation) => calculation.type !== 'conversion_unavailable');
  }

  if (options.limitation || options.conversionFallback) {
    calculations = calculations.filter((calculation) => calculation.type !== 'conversion_unavailable');
  }

  if (records.length === 0 && calculations.length === 0) {
    logFallbackReason(options.emptyReason || FALLBACK_REASONS.EMPTY_RESULT);
  }

  const summary = conversionUnavailable
    ? 'Lead conversion cannot be calculated from the CRM records.'
    : records.length === 0 && calculations.length === 0
      ? chooseFallback({ reason: options.emptyReason || FALLBACK_REASONS.EMPTY_RESULT }).answer
      : `${currentMonthLabel}${metricSummary(calculations, records.length)}`;
  const summaryWithAvailability = crmReturnedDate(datasets)
    ? `${summary} Data available through ${crmReturnedDate(datasets)}.`
    : summary;
  const observations = factualObservations(options.insights);
  const followUps = dataBackedFollowUps(records, coverage);
  const response = {
    success: true,
    summary: summaryWithAvailability,
    retrievedDataCoverage: {
      requestedPeriod: coverage.requestedPeriod,
      retrievedDataCoverage: coverage.retrievedDataCoverage,
      dataCoverage: coverage.retrievedDataCoverage,
      monthsWithData: coverage.monthsWithData,
      monthsWithoutRetrievedRecords: coverage.monthsWithoutRetrievedRecords,
      unavailablePeriods: coverage.monthsWithoutRetrievedRecords,
    },
    requestedInformation: plan.question,
    calculatedMetrics: calculations,
    businessObservations: observations,
    limitations,
    keyMetrics: calculations,
    suggestedNextAnalysis: followUps,
    data: records,
    tables: buildTables(records),
    calculations,
    insights: observations,
    followUpQuestions: followUps,
  };

  if (DEBUG_ASSISTANT) logger.info('Response Engine', {
    requestedInformation: plan.question,
    calculatedMetrics: calculations,
    limitations,
  });
  return response;
}

module.exports = { formatResponse };
