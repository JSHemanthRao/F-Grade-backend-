// Module alias registry for human-friendly module names.
// Add new aliases to ALIAS_MAP where the key is the normalized human input
// and the value is the canonical module key used by module-definition.service.

const ALIAS_MAP = {
  // Meetings / Events
  'meeting': 'events',
  'meetings': 'events',
  'event': 'events',
  'events': 'events',

  // Leads
  'lead': 'leads',
  'leads': 'leads',

  // Contacts
  'contact': 'contacts',
  'contacts': 'contacts',

  // Accounts
  'account': 'accounts',
  'accounts': 'accounts',

  // Deals
  'deal': 'deals',
  'deals': 'deals',

  // Calls
  'call': 'calls',
  'calls': 'calls',

  // Tasks
  'task': 'tasks',
  'tasks': 'tasks',

  // Notes
  'note': 'notes',
  'notes': 'notes',

  // Products
  'product': 'products',
  'products': 'products',

  // Vendors
  'vendor': 'vendors',
  'vendors': 'vendors',

  // Quotes
  'quote': 'quotes',
  'quotes': 'quotes',

  // Sales Orders
  'sales order': 'sales-orders',
  'sales orders': 'sales-orders',
  'salesorder': 'sales-orders',
  'salesorders': 'sales-orders',

  // Purchase Orders
  'purchase order': 'purchase-orders',
  'purchase orders': 'purchase-orders',
  'purchaseorder': 'purchase-orders',
  'purchaseorders': 'purchase-orders',

  // Campaigns
  'campaign': 'campaigns',
  'campaigns': 'campaigns',

  // Users
  'user': 'users',
  'users': 'users',

  // Organization / Org
  'organization': 'organization',
  'organizations': 'organization',
  'org': 'organization',

  // Renewal Accounts
  'renewal account': 'renewal-accounts',
  'renewal accounts': 'renewal-accounts',
  'renewal-accounts': 'renewal-accounts',

  // Partners, Documents, Service Provider, Co-operative banks, etc. map to their keys if needed
  'partners': 'partners',
  'documents': 'documents',
  'service provider': 'service-provider',
  'service-provider': 'service-provider',
  'co-operative banks': 'co-operative-banks',
  'cooperative banks': 'co-operative-banks',
};

function normalizeInput(input) {
  if (!input && input !== 0) return '';
  return String(input).trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveAlias(input) {
  const normalized = normalizeInput(input);
  if (!normalized) return null;

  // direct alias map
  if (ALIAS_MAP[normalized]) return ALIAS_MAP[normalized];

  // fallback: if the normalized string already matches canonical key naming
  // try common transformations: spaces -> '-', underscores -> '-', remove plural 's'
  const asHyphen = normalized.replace(/ /g, '-');
  if (ALIAS_MAP[asHyphen]) return ALIAS_MAP[asHyphen];

  // strip trailing 's' (very simple plural handling)
  if (normalized.endsWith('s')) {
    const singular = normalized.slice(0, -1);
    if (ALIAS_MAP[singular]) return ALIAS_MAP[singular];
    const singularHyphen = singular.replace(/ /g, '-');
    if (ALIAS_MAP[singularHyphen]) return ALIAS_MAP[singularHyphen];
  }

  return null;
}

module.exports = {
  resolveAlias,
  ALIAS_MAP,
};
