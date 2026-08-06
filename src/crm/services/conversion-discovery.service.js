const { zohoClient } = require('../../common/config/axios');
const { getModuleDefinition } = require('./module-definition.service');

const CONVERSION_FIELD_CANDIDATES = [
  'Converted',
  'Converted__s',
  'Converted_Time',
  'Converted_Date',
  'Converted_Date_Time',
  'Converted_Contact',
  'Converted_Account',
  'Converted_Deal',
];

function normalizeField(field) {
  return String(field?.api_name || field?.apiName || field?.name || field || '').trim();
}

function isConversionField(field) {
  return /converted|conversion/i.test(field);
}

async function discoverLeadConversionFields() {
  const definition = getModuleDefinition('leads');
  const defaultFields = (definition?.defaultFields || []).filter(isConversionField);

  if (defaultFields.length > 0) {
    return { fields: defaultFields, source: 'module_definition', metadataAvailable: false, error: null };
  }

  try {
    console.info('[CRM Assistant][Conversion] CRM call: inspect Lead field metadata', {
      endpoint: '/crm/v8/settings/fields',
      module: 'Leads',
      fieldsInspected: CONVERSION_FIELD_CANDIDATES,
    });
    const response = await zohoClient.get('/crm/v8/settings/fields', { params: { module: 'Leads' } });
    const rawFields = response.data?.fields || response.data?.data || [];
    const fields = rawFields.map(normalizeField).filter(isConversionField);
    console.info('[CRM Assistant][Conversion] Fields inspected', { fields, fieldCount: rawFields.length });
    return { fields, source: 'zoho_metadata', metadataAvailable: true, error: null };
  } catch (error) {
    console.warn('[CRM Assistant][Conversion] Metadata lookup failed', {
      reason: error?.response?.data?.code || error?.message,
    });
    return { fields: [], source: 'zoho_metadata', metadataAvailable: false, error };
  }
}

module.exports = {
  CONVERSION_FIELD_CANDIDATES,
  discoverLeadConversionFields,
};
