const DEFAULT_PER_PAGE = 200;
const MAX_PAGE_RECORDS = 2000;

function hasExplicitPagination(options = {}) {
  return options.page !== undefined && options.page !== null && options.page !== ''
    || options.per_page !== undefined && options.per_page !== null && options.per_page !== '';
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
  DEFAULT_PER_PAGE,
  fetchAllPages,
  hasExplicitPagination,
};
