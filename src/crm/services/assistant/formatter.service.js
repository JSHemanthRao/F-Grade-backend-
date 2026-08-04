function formatResponse(plan, datasets, calculations) {
  const countValue = calculations.find((calculation) => calculation.type === 'count')?.value;
  const hasComparison = plan.steps.some((step) => step.type === 'compare');
  const summary = countValue !== undefined
    ? `I analyzed your request and found ${countValue} matching records for ${plan.modules.join(', ')}.`
    : hasComparison
      ? `I analyzed your request and prepared a comparison response for ${plan.modules.join(', ')}.`
      : `I analyzed your request and prepared a ${plan.intents.join(', ').toLowerCase()} response for ${plan.modules.join(', ')}.`;
  const response = {
    success: true,
    summary,
    requestedInformation: plan.question,
    calculations,
    insights: ['The request was interpreted by the CRM reasoning engine.', 'Internal pagination and filtering are handled automatically.'],
    limitations: [],
    followUpQuestions: [
      `Would you like a breakdown by ${plan.modules[0]} owner?`,
      'Would you like this view extended to the previous period?',
    ],
  };

  return response;
}

module.exports = {
  formatResponse,
};
