const { DEBUG_ASSISTANT } = require('../../../common/config/env');

function calculateResult(plan, datasets) {
  const calculations = [];
  const getResult = (dataset) => dataset?.result || dataset || {};
  const getRecords = (dataset) => getResult(dataset).data || [];
  const getAmount = (record) => Number(record.Amount ?? record.amount ?? record.value ?? record.Grand_Total ?? 0) || 0;
  const countValue = getResult(datasets[0]).count ?? getResult(datasets[0]).info?.count ?? getRecords(datasets[0]).length;

  if (DEBUG_ASSISTANT) {
    console.info('[CRM Assistant][Calculator]', {
      calculationType: 'count',
      inputValues: datasets.map(getResult),
      output: countValue,
    });
  }

  if (plan.steps.some((step) => step.type === 'count')) {
    const count = getResult(datasets[0]).count ?? getResult(datasets[0]).info?.count ?? getRecords(datasets[0]).length;
    calculations.push({ label: 'Count', value: count, type: 'count' });
  }

  if (plan.steps.some((step) => step.type === 'aggregate')) {
    const values = datasets.flatMap(getRecords).map(getAmount);
    const sum = values.reduce((total, value) => total + value, 0);
    calculations.push({ label: 'Sum', value: sum, type: 'sum' });
    if (plan.intents.includes('AGGREGATION') && /average|avg/i.test(plan.question)) {
      calculations.push({ label: 'Average', value: values.length ? sum / values.length : 0, type: 'average' });
    }
  }

  if (plan.steps.some((step) => step.type === 'compare')) {
    const periods = datasets.reduce((result, dataset) => {
      result[dataset.period || 'all time'] = getRecords(dataset);
      return result;
    }, {});
    const thisMonth = periods['this month'] || [];
    const lastMonth = periods['last month'] || [];
    const thisValue = thisMonth.reduce((sum, record) => sum + getAmount(record), 0);
    const lastValue = lastMonth.reduce((sum, record) => sum + getAmount(record), 0);
    calculations.push({
      label: 'Comparison',
      type: 'comparison',
      value: { 'this month': thisValue, 'last month': lastValue, difference: thisValue - lastValue },
    });
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

  if (plan.intents.includes('ANALYTICS')) {
    const owners = {};
    datasets.flatMap(getRecords).forEach((record) => {
      const owner = record.Owner?.name || record.Owner?.Name || record.Owner_Name || record.owner || 'Unassigned';
      owners[owner] = (owners[owner] || 0) + 1;
    });
    calculations.push({ label: 'Top owners', type: 'top_owners', value: Object.entries(owners)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([owner, count]) => ({ owner, count })) });
  }

  if (DEBUG_ASSISTANT) console.info('[CRM Assistant][Calculation] ↓', { calculations });

  return calculations;
}

module.exports = {
  calculateResult,
};
