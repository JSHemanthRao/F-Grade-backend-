function calculateResult(plan, datasets) {
  const calculations = [];

  if (plan.steps.some((step) => step.type === 'count')) {
    const count = datasets[0]?.count ?? datasets[0]?.info?.count ?? datasets[0]?.data?.length ?? 0;
    calculations.push({ label: 'Count', value: count, type: 'count' });
  }

  if (plan.steps.some((step) => step.type === 'aggregate')) {
    const values = (datasets[0]?.data || []).map((item) => Number(item.Amount ?? item.amount ?? item.value ?? 0));
    const sum = values.reduce((total, value) => total + value, 0);
    calculations.push({ label: 'Sum', value: sum, type: 'sum' });
  }

  if (plan.steps.some((step) => step.type === 'compare')) {
    calculations.push({ label: 'Comparison', value: 'Compared across requested periods', type: 'comparison' });
  }

  return calculations;
}

module.exports = {
  calculateResult,
};
