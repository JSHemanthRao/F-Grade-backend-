const assistantEngine = require('./src/crm/services/assistant-engine.service');
const recordsService = require('./src/crm/services/records.service');

const originalGetRecords = recordsService.getRecords;
recordsService.getRecords = async (moduleKey, options) => {
  console.log('DEBUG getRecords', moduleKey, options && options.criteria, options && options.canonicalFilters, options && options.requestedFilters);
  return { data: [{ id: `${moduleKey}-1`, Amount: moduleKey === 'deals' ? 100 : 0 }], info: { count: 1, more_records: false } };
};

(async () => {
  try {
    const response = await assistantEngine.handleAssistantRequest({ question: 'Compare leads and deals created this month' });
    console.log('DEBUG RESPONSE', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('DEBUG ERROR', error);
  } finally {
    recordsService.getRecords = originalGetRecords;
  }
})();
