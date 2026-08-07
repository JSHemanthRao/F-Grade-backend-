function recordsFrom(datasets) {
  return datasets.flatMap((dataset) => dataset?.result?.data || dataset?.data || []);
}

function amountOf(record) {
  return Number(record.Amount ?? record.amount ?? record.value ?? record.Grand_Total ?? 0) || 0;
}

function generateInsights(plan, datasets, calculations) {
  const insights = [];
  const records = recordsFrom(datasets);
  const valued = records.filter((record) => amountOf(record) !== 0);

  if (valued.length > 1) {
    const highest = valued.reduce((best, record) => amountOf(record) > amountOf(best) ? record : best);
    const lowest = valued.reduce((best, record) => amountOf(record) < amountOf(best) ? record : best);
    insights.push({ type: 'highest_value', message: `Highest recorded value: ${amountOf(highest)}.` });
    insights.push({ type: 'lowest_value', message: `Lowest recorded value: ${amountOf(lowest)}.` });
  }

  calculations.filter((calculation) => calculation.type === 'top_owners').forEach((calculation) => {
    if (calculation.value[0]) insights.push({ type: 'top_performer', message: `Top performer: ${calculation.value[0].owner} with ${calculation.value[0].count} records.` });
    if (calculation.value.at(-1)) insights.push({ type: 'bottom_performer', message: `Lowest recorded performer total: ${calculation.value.at(-1).owner} with ${calculation.value.at(-1).count} records.` });
  });

  calculations.filter((calculation) => calculation.type === 'monthly_performance').forEach((calculation) => {
    const months = Object.keys(calculation.value.monthlyTotals || {}).sort();
    const previousMonth = months.at(-2);
    const currentMonth = months.at(-1);
    if (previousMonth && currentMonth && calculation.value.growth > 0) insights.push({ type: 'increase', message: `${currentMonth} value increased from ${calculation.value.monthlyTotals[previousMonth]} in ${previousMonth} to ${calculation.value.monthlyTotals[currentMonth]} in ${currentMonth}.` });
    if (previousMonth && currentMonth && calculation.value.growth < 0) insights.push({ type: 'decrease', message: `${currentMonth} value decreased from ${calculation.value.monthlyTotals[previousMonth]} in ${previousMonth} to ${calculation.value.monthlyTotals[currentMonth]} in ${currentMonth}.` });
  });

  return insights;
}

module.exports = { generateInsights };
