const DEFAULT_PER_PAGE = 200;
const MAX_PAGE_RECORDS = 2000;
const DEFAULT_LIMITED_PER_PAGE = 25;

const FULL_RETRIEVAL_PATTERNS = [
  /\ball\b/,
  /\bevery\b/,
  /\bcomplete\b/,
  /\bentire\b/,
  /\bcount\b/,
  /\btotal\b/,
  /\bsum\b/,
  /\bsummary\b/,
  /\banalytics?\b/,
  /\bdashboard\b/,
  /\bcompare\b/,
  /\bconversion\b/,
  /\brate\b/,
  /\brevenue\b/,
  /\bhighest\b/,
  /\blowest\b/,
  /\btop\b/,
  /\bmonthly\b/,
  /\bbusiness\s+summary\b/,
];

const LIMITED_COUNT_PATTERN = /\b(?:first|latest|recent|newest|last|only|limit(?:ed)?\s+to|show)\s+(\d{1,3})\b/;
const PAGE_PATTERN = /\bpage\s+(\d{1,6})\b/;

function hasExplicitPagination(options = {}) {
  return options.page !== undefined && options.page !== null && options.page !== ''
    || options.per_page !== undefined && options.per_page !== null && options.per_page !== '';
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    return Object.values(value).map(normalizeText).filter(Boolean).join(' ');
  }

  return String(value).trim().toLowerCase();
}

function getRequestText(options = {}) {
  return normalizeText(
    options.requestText
    || options.request_text
    || options.userQuery
    || options.user_query
    || options.question
    || options.prompt
    || options.message
    || options.search
  );
}

function hasFullRetrievalIntent(requestText) {
  return FULL_RETRIEVAL_PATTERNS.some((pattern) => pattern.test(requestText));
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function clampPerPage(value) {
  const parsed = parsePositiveInteger(value);

  if (!parsed) {
    return null;
  }

  return Math.min(parsed, DEFAULT_PER_PAGE);
}

function getSingularModuleTerms(moduleDefinition = {}) {
  const label = normalizeText(moduleDefinition.label);
  const endpoint = normalizeText(moduleDefinition.endpoint).replace(/_/g, ' ');
  const terms = new Set([label, endpoint]);

  Array.from(terms).forEach((term) => {
    if (term.endsWith('ies')) {
      terms.add(`${term.slice(0, -3)}y`);
    } else if (term.endsWith('s')) {
      terms.add(term.slice(0, -1));
    }
  });

  return Array.from(terms).filter(Boolean).sort((a, b) => b.length - a.length);
}

function hasSpecificRecordIntent(requestText, moduleDefinition) {
  if (!requestText) {
    return false;
  }

  const moduleTerms = getSingularModuleTerms(moduleDefinition);

  return moduleTerms.some((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b(?:show|get|find|lookup|display)\\s+(?:the\\s+)?${escapedTerm}\\s+\\S+`);
    return pattern.test(requestText);
  });
}

function getRetrievalPlan(moduleDefinition, options = {}) {
  if (hasExplicitPagination(options)) {
    return {
      fetchAll: false,
      params: {},
      reason: 'explicit_pagination',
    };
  }

  if (options.ids !== undefined && options.ids !== null && options.ids !== '') {
    return {
      fetchAll: false,
      params: {},
      reason: 'explicit_ids',
    };
  }

  const requestText = getRequestText(options);

  if (requestText && hasFullRetrievalIntent(requestText)) {
    return {
      fetchAll: true,
      params: {},
      reason: 'complete_analysis_intent',
    };
  }

  const pageMatch = requestText.match(PAGE_PATTERN);
  const requestedPage = pageMatch ? parsePositiveInteger(pageMatch[1]) : null;

  if (requestedPage) {
    return {
      fetchAll: false,
      params: {
        page: requestedPage,
        per_page: DEFAULT_PER_PAGE,
      },
      reason: 'requested_page',
    };
  }

  const limitMatch = requestText.match(LIMITED_COUNT_PATTERN);
  const requestedLimit = limitMatch ? clampPerPage(limitMatch[1]) : null;

  if (requestedLimit) {
    return {
      fetchAll: false,
      params: {
        page: 1,
        per_page: requestedLimit,
      },
      reason: 'requested_limited_count',
    };
  }

  if (hasSpecificRecordIntent(requestText, moduleDefinition)) {
    return {
      fetchAll: false,
      params: {
        page: 1,
        per_page: DEFAULT_LIMITED_PER_PAGE,
      },
      reason: 'specific_record_intent',
    };
  }

  return {
    fetchAll: true,
    params: {},
    reason: 'default_complete_dataset',
  };
}

async function fetchAllPages({
  fetchPage,
  baseParams = {},
  dataKey = 'data',
  perPage = DEFAULT_PER_PAGE,
}) {
  const allRecords = [];
  let page = 1;
  let pageToken = null;
  let lastPayload = null;

  while (true) {
    const params = {
      ...baseParams,
      per_page: perPage,
    };

    if (pageToken) {
      params.page_token = pageToken;
    } else {
      params.page = page;
    }

    const payload = await fetchPage(params);
    const pageRecords = Array.isArray(payload?.[dataKey]) ? payload[dataKey] : [];
    const info = payload?.info || {};

    lastPayload = payload || {};

    if (pageRecords.length === 0) {
      break;
    }

    allRecords.push(...pageRecords);

    if (info.more_records !== true) {
      break;
    }

    const nextPageToken = info.next_page_token;

    if (pageToken) {
      if (!nextPageToken) {
        break;
      }

      pageToken = nextPageToken;
      continue;
    }

    if (page * perPage >= MAX_PAGE_RECORDS) {
      if (!nextPageToken) {
        break;
      }

      pageToken = nextPageToken;
      continue;
    }

    page += 1;
  }

  return {
    ...(lastPayload || {}),
    [dataKey]: allRecords,
    info: {
      ...((lastPayload && lastPayload.info) || {}),
      count: allRecords.length,
      page: 1,
      per_page: perPage,
      more_records: false,
    },
  };
}

module.exports = {
  DEFAULT_LIMITED_PER_PAGE,
  DEFAULT_PER_PAGE,
  fetchAllPages,
  getRetrievalPlan,
  hasExplicitPagination,
};
