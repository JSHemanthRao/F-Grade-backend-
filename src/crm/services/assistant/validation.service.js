function getRecords(dataset) {
  return dataset?.result?.data || dataset?.data || [];
}

function expectedTaskCount(plan, question) {
  const explicitPeriodComparison = /\bthis month\b[\s\S]*\blast month\b|\blast month\b[\s\S]*\bthis month\b/i.test(question)
    || (plan.steps.some((step) => step.type === 'compare') && /\blast month\b/i.test(question));
  return plan.steps.reduce((total, step) => {
    const modules = step.modules?.length ? step.modules.length : 1;
    const periods = (step.type === 'compare' && explicitPeriodComparison)
      || (step.type === 'conversion_count' && plan.intents.includes('COMPARE')) ? 2 : 1;
    return total + (modules * periods);
  }, 0);
}

function validateExecution({ plan, question, datasets, calculations }) {
  const issues = [];
  const expected = expectedTaskCount(plan, question);
  if (datasets.length < expected) issues.push('required_tasks_incomplete');
  const plannedModules = new Set(plan.modules || []);
  if (datasets.some((dataset) => dataset.module && plannedModules.size > 0 && !plannedModules.has(dataset.module))) issues.push('unexpected_dataset');

  datasets.forEach((dataset) => {
    if (!dataset?.result || typeof dataset.result !== 'object') issues.push('dataset_missing');
    if (dataset?.result?.info?.more_records === true && !dataset.step?.explicit) issues.push('dataset_incomplete');
    const ids = getRecords(dataset).map((record) => record?.id ?? record?.ID).filter(Boolean).map(String);
    if (new Set(ids).size !== ids.length) issues.push('duplicate_records');
  });

  const types = new Set(calculations.map((calculation) => calculation.type));
  if (plan.steps.some((step) => step.type === 'count') && !types.has('count') && !types.has('counts')) issues.push('count_not_calculated');
  if (plan.steps.some((step) => ['aggregate', 'compare', 'analytics'].includes(step.type)) && calculations.length === 0) issues.push('calculations_missing');

  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

module.exports = {
  expectedTaskCount,
  validateExecution,
};
