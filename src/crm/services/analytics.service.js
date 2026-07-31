const { zohoClient } = require('../../common/config/axios');
const { getModuleDefinition } = require('./module-definition.service');

const ANALYTICS_METRICS = {
  leads_created: {
    defaultModuleKey: 'leads',
    source: 'count',
    dateField: 'Created_Time',
  },
  deals_created: {
    defaultModuleKey: 'deals',
    source: 'count',
    dateField: 'Created_Time',
  },
  deals_closed_won: {
    defaultModuleKey: 'deals',
    source: 'count',
    dateField: 'Closing_Date',
    extraWhere: "Stage = 'Closed Won'",
  },
  lead_conversions: {
    defaultModuleKey: 'leads',
    source: 'coql',
    dateField: 'Converted_Date_Time',
    extraWhere: 'Converted__s = true',
  },
  lead_to_deal_conversions: {
    defaultModuleKey: 'leads',
    source: 'coql',
    dateField: 'Converted_Date_Time',
    extraWhere: 'Converted__s = true and Converted_Deal is not null',
  },
  total_deal_value: {
    defaultModuleKey: 'deals',
    source: 'coql',
    aggregate: 'SUM',
    aggregateField: 'Amount',
    dateField: 'Created_Time',
  },
  average_deal_value: {
    defaultModuleKey: 'deals',
    source: 'coql',
    aggregate: 'AVG',
    aggregateField: 'Amount',
    dateField: 'Created_Time',
  },
};

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeMetric(metric) {
  return normalizeText(metric).toLowerCase();
}

function normalizePeriod(period) {
  const value = normalizeText(period).toLowerCase();

  if (!value) {
    return 'all';
  }

  const supported = new Set(['all', 'today', 'this_week', 'this_month', 'last_month', 'this_year', 'custom']);

  return supported.has(value) ? value : null;
}

function toZohoDateTime(date) {
  return date.toISOString().replace('.000Z', 'Z');
}

function getPeriodWindow(period) {
  const now = new Date();

  switch (period) {
    case 'today': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
      return { start, end };
    }
    case 'this_week': {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff, 0, 0, 0, 0));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7, 0, 0, 0, 0));
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
      return { start, end };
    }
    case 'last_month': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      return { start, end };
    }
    case 'this_year': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
      return { start, end };
    }
    default:
      return null;
  }
}

function quoteCriteriaValue(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "''";
  }

  if (/^(true|false)$/i.test(normalized) || /^-?\d+(\.\d+)?$/.test(normalized)) {
    return normalized.toLowerCase();
  }

  return `'${normalized.replace(/'/g, "\\'")}'`;
}

function translateSimpleCriteriaToCoql(criteria) {
  const normalized = normalizeText(criteria);

  if (!normalized) {
    return null;
  }

  const compact = normalized
    .replace(/^\(+|\)+$/g, '')
    .replace(/\)\s*and\s*\(/gi, ' and ')
    .replace(/\)\s*or\s*\(/gi, ' or ');

  const translated = compact.replace(
    /([A-Za-z0-9_.]+)\s*:\s*(equals|not_equal|greater_equal|greater_than|less_equal|less_than|starts_with|in|not_in)\s*:\s*([^)]+?)(?=\s+(?:and|or)\s+|$)/gi,
    (_match, field, operator, rawValue) => {
      const value = normalizeText(rawValue);

      switch (operator.toLowerCase()) {
        case 'equals':
          return `${field} = ${quoteCriteriaValue(value)}`;
        case 'not_equal':
          return `${field} != ${quoteCriteriaValue(value)}`;
        case 'greater_equal':
          return `${field} >= ${quoteCriteriaValue(value)}`;
        case 'greater_than':
          return `${field} > ${quoteCriteriaValue(value)}`;
        case 'less_equal':
          return `${field} <= ${quoteCriteriaValue(value)}`;
        case 'less_than':
          return `${field} < ${quoteCriteriaValue(value)}`;
        case 'starts_with':
          return `${field} like ${quoteCriteriaValue(`${value}%`)}`;
        case 'in':
          return `${field} in (${value.split(',').map((item) => quoteCriteriaValue(item)).join(', ')})`;
        case 'not_in':
          return `${field} not in (${value.split(',').map((item) => quoteCriteriaValue(item)).join(', ')})`;
        default:
          return null;
      }
    }
  );

  if (translated === compact) {
    return compact;
  }

  return translated;
}

function buildDateWhereClause(fieldName, period) {
  if (!period || period === 'all') {
    return null;
  }

  const window = getPeriodWindow(period);

  if (!window) {
    return null;
  }

  return `${fieldName} >= '${toZohoDateTime(window.start)}' and ${fieldName} < '${toZohoDateTime(window.end)}'`;
}

function combineWhereClauses(clauses) {
  return clauses
    .filter(Boolean)
    .map((clause) => `(${clause})`)
    .join(' and ');
}

function buildFailure(metric, reason, missingRequirements = []) {
  return {
    success: false,
    metric,
    reason,
    missingRequirements,
  };
}

function buildModuleLabel(moduleKey) {
  const moduleDefinition = getModuleDefinition(moduleKey);
  return moduleDefinition ? moduleDefinition.label : null;
}

async function runCountEndpoint({ moduleKey, whereClause }) {
  const params = {};

  if (whereClause) {
    params.criteria = whereClause;
  }

  const response = await zohoClient.get(`/crm/v8/${getModuleDefinition(moduleKey).endpoint}/actions/count`, {
    params,
  });

  return Number(response.data?.count ?? 0);
}

async function runCoqlAggregate({ moduleKey, selectExpression, whereClause }) {
  const query = whereClause
    ? `select ${selectExpression} from ${getModuleDefinition(moduleKey).endpoint} where ${whereClause}`
    : `select ${selectExpression} from ${getModuleDefinition(moduleKey).endpoint}`;

  const response = await zohoClient.post('/crm/v8/coql', {
    select_query: query,
  });

  const row = Array.isArray(response.data?.data) ? response.data.data[0] || {} : {};
  const value = row.result_value ?? row[selectExpression] ?? row[selectExpression.toUpperCase()] ?? 0;

  return Number(value ?? 0);
}

function buildAnalyticsPlan(options = {}) {
  const metric = normalizeMetric(options.metric);
  const metricConfig = ANALYTICS_METRICS[metric];

  if (!metricConfig) {
    return {
      failure: buildFailure(metric || null, 'unsupported_metric', ['metric']),
    };
  }

  const period = normalizePeriod(options.period);

  if (!period) {
    return {
      failure: buildFailure(metric, 'unsupported_period', ['period']),
    };
  }

  const requestedModule = normalizeText(options.module).toLowerCase();
  const expectedModuleKey = metricConfig.defaultModuleKey;
  const moduleKey = requestedModule || expectedModuleKey;

  if (requestedModule && requestedModule !== expectedModuleKey) {
    return {
      failure: buildFailure(metric, 'metric_module_mismatch', ['module']),
    };
  }

  const moduleLabel = buildModuleLabel(moduleKey);

  if (!moduleLabel) {
    return {
      failure: buildFailure(metric, 'unsupported_module', ['module']),
    };
  }

  const rawFilter = options.filter ?? options.filters ?? options.criteria;
  const translatedFilter = translateSimpleCriteriaToCoql(rawFilter);

  if (rawFilter && !translatedFilter) {
    return {
      failure: buildFailure(metric, 'untranslatable_filter', ['filter']),
    };
  }

  const dateWhereClause = buildDateWhereClause(metricConfig.dateField, period);
  const whereClauses = [];

  if (metricConfig.extraWhere) {
    whereClauses.push(metricConfig.extraWhere);
  }

  if (dateWhereClause) {
    whereClauses.push(dateWhereClause);
  }

  if (translatedFilter) {
    whereClauses.push(translatedFilter);
  }

  return {
    metric,
    period,
    moduleKey,
    moduleLabel,
    metricConfig,
    whereClause: combineWhereClauses(whereClauses),
  };
}

async function getAnalytics(options = {}) {
  const plan = buildAnalyticsPlan(options);

  if (plan.failure) {
    return plan.failure;
  }

  const { metric, period, moduleKey, moduleLabel, metricConfig, whereClause } = plan;

  try {
    let count = 0;

    if (metricConfig.source === 'count') {
      count = await runCountEndpoint({ moduleKey, whereClause });
    } else if (metricConfig.aggregate === 'SUM') {
      count = await runCoqlAggregate({
        moduleKey,
        selectExpression: 'SUM(Amount) as result_value',
        whereClause,
      });
    } else if (metricConfig.aggregate === 'AVG') {
      count = await runCoqlAggregate({
        moduleKey,
        selectExpression: 'AVG(Amount) as result_value',
        whereClause,
      });
    } else if (metricConfig.source === 'coql') {
      count = await runCoqlAggregate({
        moduleKey,
        selectExpression: 'COUNT(id) as result_value',
        whereClause,
      });
    } else {
      return buildFailure(metric, 'unsupported_metric_source', ['metric']);
    }

    return {
      success: true,
      metric,
      period,
      module: moduleLabel,
      count,
      source: 'Zoho CRM',
    };
  } catch (error) {
    return buildFailure(metric, error?.message || 'zoho_request_failed', ['metric']);
  }
}

module.exports = {
  ANALYTICS_METRICS,
  getAnalytics,
};
