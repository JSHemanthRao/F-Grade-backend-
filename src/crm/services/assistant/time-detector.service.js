function detectTimeRange(question) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();

  if (/today/.test(normalizedQuestion)) return { label: 'today', range: 'today' };
  if (/yesterday/.test(normalizedQuestion)) return { label: 'yesterday', range: 'yesterday' };
  if (/this week/.test(normalizedQuestion)) return { label: 'this week', range: 'this_week' };
  if (/last week/.test(normalizedQuestion)) return { label: 'last week', range: 'last_week' };
  if (/this month/.test(normalizedQuestion)) return { label: 'this month', range: 'this_month' };
  if (/last month/.test(normalizedQuestion)) return { label: 'last month', range: 'last_month' };
  if (/this quarter/.test(normalizedQuestion)) return { label: 'this quarter', range: 'this_quarter' };
  if (/last quarter/.test(normalizedQuestion)) return { label: 'last quarter', range: 'last_quarter' };
  if (/this year/.test(normalizedQuestion)) return { label: 'this year', range: 'this_year' };
  if (/last year/.test(normalizedQuestion)) return { label: 'last year', range: 'last_year' };
  if (/last 30 days/.test(normalizedQuestion)) return { label: 'last 30 days', range: 'last_30_days' };

  return { label: 'all time', range: 'all_time' };
}

module.exports = {
  detectTimeRange,
};
