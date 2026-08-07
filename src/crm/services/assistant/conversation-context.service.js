const REFERENCE_PATTERN = /\b(it|its|this|that|these|those|them|same|again|continue|remaining|next|previous)\b/i;

function resolveConversationContext(question = '', context = {}) {
  const previousQuestion = String(context.lastQuestion || context.previousQuestion || '').trim();
  const planModules = context.lastPlan?.modules || context.previousPlan?.modules;
  const datasetModules = Array.isArray(context.datasets) ? context.datasets.map((dataset) => dataset?.module) : [];
  const previousModules = [...new Set([
    ...(Array.isArray(context.modules) ? context.modules : []),
    ...(Array.isArray(planModules) ? planModules : []),
    ...datasetModules,
  ].filter(Boolean))];
  const referenceMatch = String(question).match(REFERENCE_PATTERN);
  const hasReference = Boolean(referenceMatch);
  const continuation = /\b(continue|remaining|next|again)\b/i.test(question);

  return {
    previousQuestion: previousQuestion || null,
    previousModules,
    reference: referenceMatch?.[1]?.toLowerCase() || null,
    hasReference,
    continuation,
    datasets: Array.isArray(context.datasets) ? context.datasets : [],
    effectiveModules: previousModules,
    previousTimeRange: context.lastPlan?.timeRange || context.previousPlan?.timeRange || null,
    previousPagination: context.lastPlan?.pagination || context.previousPlan?.pagination || context.pagination || null,
  };
}

module.exports = { resolveConversationContext };
