const { DEBUG_ASSISTANT } = require('../../../common/config/env');
const logger = require('../../../common/logging/logger');

function calculateResult(plan, datasets) {
  const calculations = [];
  const getResult = (dataset) => dataset?.result || dataset || {};
  const getRecords = (dataset) => getResult(dataset).data || [];
  const getAmount = (record) => {
    const raw = record.Amount ?? record.amount ?? record.value ?? record.Grand_Total;
    if (raw === undefined || raw === null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  const countValue = getRecords(datasets[0]).length;

  if (DEBUG_ASSISTANT) {
    logger.info('Analytics Engine', {
      calculationType: 'count',
      inputValues: datasets.map(getResult),
      output: countValue,
    });
  }

  if (plan.steps.some((step) => step.type === 'count')) {
    const countDatasets = datasets.filter((dataset) => dataset.step?.type === 'count' || plan.steps.length === 1);
    if (countDatasets.length <= 1) {
      const count = getRecords(countDatasets[0] || datasets[0]).length;
      calculations.push({ label: 'Count', value: count, type: 'count' });
    } else {
      const counts = {};
      countDatasets.forEach((dataset) => {
        counts[dataset.module] = getRecords(dataset).length;
      });
      calculations.push({ label: 'Counts', value: counts, type: 'counts' });
    }
  }

  if (plan.steps.some((step) => step.type === 'aggregate')) {
    const values = datasets.flatMap(getRecords).map(getAmount).filter((value) => value !== null);
    if (values.length === 0) return calculations;
    const sum = values.reduce((total, value) => total + value, 0);
    calculations.push({ label: 'Sum', value: sum, type: 'sum' });
    if (plan.intents.includes('AGGREGATION') && /average|avg/i.test(plan.question)) {
      calculations.push({ label: 'Average', value: values.length ? sum / values.length : 0, type: 'average' });
    }
    if (/median/i.test(plan.question)) {
      const sorted = [...values].sort((a, b) => a - b);
      calculations.push({ label: 'Median', value: sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : 0, type: 'median' });
    }
    if (/maximum|highest|max/i.test(plan.question)) calculations.push({ label: 'Maximum', value: values.length ? Math.max(...values) : 0, type: 'maximum' });
    if (/minimum|lowest|min/i.test(plan.question)) calculations.push({ label: 'Minimum', value: values.length ? Math.min(...values) : 0, type: 'minimum' });
  }

  if (plan.steps.some((step) => step.type === 'compare')) {
    const modules = [...new Set(datasets.map((dataset) => dataset.module).filter(Boolean))];
    const hasPeriods = datasets.some((dataset) => dataset.period);
    const periods = datasets.reduce((result, dataset) => {
      const period = dataset.period || 'all time';
      const module = dataset.module || 'crm';
      if (!result[period]) result[period] = {};
      result[period][module] = getRecords(dataset);
      return result;
    }, {});
    const comparison = {};
    modules.forEach((module) => {
      const thisValue = (periods['this month']?.[module] || periods['all time']?.[module] || []).reduce((sum, record) => sum + (getAmount(record) ?? 0), 0);
      const lastValue = (periods['last month']?.[module] || []).reduce((sum, record) => sum + (getAmount(record) ?? 0), 0);
      comparison[module] = { 'this month': thisValue, 'last month': lastValue, difference: thisValue - lastValue };
    });
    if (!hasPeriods && modules.length === 1 && /last\s+\d+\s+months?|last\s+year|\b(?:20\d{2})\b/i.test(plan.question)) {
      const monthlyTotals = {};
      (periods['all time']?.[modules[0]] || []).forEach((record) => {
        const date = record.Closing_Date || record.Created_Time || record.CreatedDate || record.created_time;
        const parsed = date ? new Date(date) : null;
        if (!parsed || Number.isNaN(parsed.valueOf())) return;
        const month = parsed.toISOString().slice(0, 7);
        const amount = getAmount(record);
        if (amount !== null) monthlyTotals[month] = (monthlyTotals[month] || 0) + amount;
      });
      const months = Object.keys(monthlyTotals).sort();
      const previous = months.at(-2) ? new Date(`${months.at(-2)}-01T00:00:00Z`) : null;
      const current = months.at(-1) ? new Date(`${months.at(-1)}-01T00:00:00Z`) : null;
      const consecutive = previous && current
        && (current.getUTCFullYear() * 12 + current.getUTCMonth()) - (previous.getUTCFullYear() * 12 + previous.getUTCMonth()) === 1;
      const growth = consecutive && monthlyTotals[months[months.length - 2]] !== 0
        ? (monthlyTotals[months[months.length - 1]] - monthlyTotals[months[months.length - 2]]) / Math.abs(monthlyTotals[months[months.length - 2]])
        : null;
      calculations.push({
        label: 'Monthly performance',
        type: 'monthly_performance',
        value: {
          monthlyTotals,
          growth,
          historicalMonthsComplete: plan.timeRange?.historicalOnly === true,
          includesCurrentMonth: plan.timeRange?.includesCurrentMonth === true,
        },
      });
    } else if (modules.length <= 1) {
      const value = comparison[modules[0]] || { 'this month': 0, 'last month': 0, difference: 0 };
      calculations.push({ label: 'Comparison', type: 'comparison', value });
    } else {
      calculations.push({ label: 'CRM comparison', type: 'multi_module_comparison', value: comparison });
    }
  }

  if (plan.steps.some((step) => step.type === 'conversion_count')) {
    const records = datasets.flatMap(getRecords);
    if (records.length === 0) {
      return calculations;
    }
    const conversionFields = ['Converted', 'Converted__s', 'Converted_Deal', 'Converted_Date', 'Converted_Time', 'Converted_Date_Time', 'Conversion_Date'];
    const hasConversionData = records.some((record) => conversionFields.some((field) => Object.prototype.hasOwnProperty.call(record, field)));
    if (!hasConversionData) {
      calculations.push({ label: 'Conversion data unavailable', type: 'conversion_unavailable', value: true });
    } else {
      const converted = records.filter((record) => (
        record.Converted__s === true
        || String(record.Converted__s).toLowerCase() === 'true'
        || record.Converted_Deal
        || record.Converted_Date_Time
        || record.Converted_Time
        || record.Conversion_Date
      ));
      calculations.push({ label: 'Conversions', type: 'conversion_count', value: converted.length });
      const conversionStep = plan.steps.find((step) => step.type === 'conversion_count');
      if (conversionStep?.metric === 'rate') {
        calculations.push({ label: 'Conversion rate', type: 'conversion_rate', value: records.length ? converted.length / records.length : 0 });
      }
      if (/owner|by\s+owner/i.test(plan.question)) {
        const owners = {};
        converted.forEach((record) => {
          const owner = record.Owner?.name || record.Owner?.Name || record.Owner_Name || record.owner || 'Unassigned';
          owners[owner] = (owners[owner] || 0) + 1;
        });
        calculations.push({ label: 'Converted leads by owner', type: 'conversion_by_owner', value: owners });
      }
    }
  }

  if (plan.intents.includes('ANALYTICS') || plan.report) {
    const owners = {};
    datasets.flatMap(getRecords).forEach((record) => {
      const owner = record.Owner?.name || record.Owner?.Name || record.Owner_Name || record.owner || 'Unassigned';
      owners[owner] = (owners[owner] || 0) + 1;
    });
    calculations.push({ label: 'Top owners', type: 'top_owners', value: Object.entries(owners)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([owner, count]) => ({ owner, count })) });
    const stages = {};
    datasets.flatMap(getRecords).forEach((record) => {
      const stage = record.Stage || record.Status;
      if (stage) stages[stage] = (stages[stage] || 0) + 1;
    });
    if (Object.keys(stages).length > 0) calculations.push({ label: 'Stage distribution', type: 'stage_distribution', value: stages });
    if (plan.report || /pipeline/i.test(plan.question)) {
      const pipelineValues = datasets.flatMap(getRecords)
        .filter((record) => !/closed\s+(won|lost)/i.test(record.Stage || ''))
        .map(getAmount)
        .filter((value) => value !== null);
      if (pipelineValues.length > 0) calculations.push({ label: 'Pipeline', type: 'pipeline', value: pipelineValues.reduce((sum, value) => sum + value, 0) });
    }
  }

  if (DEBUG_ASSISTANT) logger.info('Analytics Engine', { calculations });

  return calculations;
}

module.exports = {
  calculateResult,
};
