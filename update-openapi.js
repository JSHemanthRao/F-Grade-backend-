const fs = require('fs');
const path = require('path');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'F-Grade Corporate AI Backend',
    description: 'REST API for Zoho CRM, Books, Inventory, People, and Analytics through the F-Grade Corporate AI Backend.',
    version: '1.0.0',
    contact: { name: 'F-Grade' },
    license: { name: 'Internal Use Only' }
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Development' }],
  tags: [
    { name: 'System', description: 'System endpoints' },
    { name: 'CRM', description: 'Zoho CRM endpoints' },
    { name: 'Books', description: 'Zoho Books endpoints' },
    { name: 'Inventory', description: 'Zoho Inventory endpoints' },
    { name: 'People', description: 'Zoho People endpoints' },
    { name: 'Analytics', description: 'Zoho Analytics endpoints' }
  ],
  paths: {},
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'OK' },
          service: { type: 'string', example: 'F-Grade Corporate AI Backend' }
        }
      },
      RecordListResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { type: 'object', additionalProperties: true } }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Internal Server Error' }
        }
      }
    }
  }
};

function addPath(pathName, method, tag, summary, description, operationId, params = []) {
  if (!spec.paths[pathName]) spec.paths[pathName] = {};
  spec.paths[pathName][method] = {
    tags: [tag],
    summary,
    description,
    operationId,
    parameters: params,
    responses: {
      200: {
        description: 'Request succeeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RecordListResponse' }
          }
        }
      },
      500: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }
  };
}

addPath('/health', 'get', 'System', 'Health Check', 'Returns the backend health status.', 'getHealth');

const crmPaths = [
  ['/api/crm/leads', 'get', 'CRM', 'Get CRM Leads', 'Returns CRM lead records from Zoho CRM.', 'getLeads'],
  ['/api/crm/contacts', 'get', 'CRM', 'Get CRM Contacts', 'Returns CRM contact records from Zoho CRM.', 'getContacts'],
  ['/api/crm/accounts', 'get', 'CRM', 'Get CRM Accounts', 'Returns CRM account records from Zoho CRM.', 'getAccounts'],
  ['/api/crm/deals', 'get', 'CRM', 'Get CRM Deals', 'Returns CRM deal records from Zoho CRM.', 'getDeals'],
  ['/api/crm/tasks', 'get', 'CRM', 'Get CRM Tasks', 'Returns CRM task records from Zoho CRM.', 'getTasks'],
  ['/api/crm/events', 'get', 'CRM', 'Get CRM Events', 'Returns CRM event records from Zoho CRM.', 'getEvents'],
  ['/api/crm/calls', 'get', 'CRM', 'Get CRM Calls', 'Returns CRM call records from Zoho CRM.', 'getCalls'],
  ['/api/crm/meetings', 'get', 'CRM', 'Get CRM Meetings', 'Returns CRM meeting records from Zoho CRM.', 'getMeetings'],
  ['/api/crm/notes', 'get', 'CRM', 'Get CRM Notes', 'Returns CRM notes from Zoho CRM.', 'getNotes'],
  ['/api/crm/products', 'get', 'CRM', 'Get CRM Products', 'Returns CRM products from Zoho CRM.', 'getProducts'],
  ['/api/crm/vendors', 'get', 'CRM', 'Get CRM Vendors', 'Returns CRM vendors from Zoho CRM.', 'getVendors'],
  ['/api/crm/quotes', 'get', 'CRM', 'Get CRM Quotes', 'Returns CRM quotes from Zoho CRM.', 'getQuotes'],
  ['/api/crm/salesorders', 'get', 'CRM', 'Get CRM Sales Orders', 'Returns CRM sales orders from Zoho CRM.', 'getSalesOrders'],
  ['/api/crm/purchaseorders', 'get', 'CRM', 'Get CRM Purchase Orders', 'Returns CRM purchase orders from Zoho CRM.', 'getPurchaseOrders'],
  ['/api/crm/campaigns', 'get', 'CRM', 'Get CRM Campaigns', 'Returns CRM campaigns from Zoho CRM.', 'getCampaigns'],
  ['/api/crm/cases', 'get', 'CRM', 'Get CRM Cases', 'Returns CRM cases from Zoho CRM.', 'getCases'],
  ['/api/crm/solutions', 'get', 'CRM', 'Get CRM Solutions', 'Returns CRM solutions from Zoho CRM.', 'getSolutions'],
  ['/api/crm/users', 'get', 'CRM', 'Get CRM Users', 'Returns CRM users from Zoho CRM.', 'getUsers'],
  ['/api/crm/renewal-accounts', 'get', 'CRM', 'Get Renewal Accounts', 'Returns renewal account records from Zoho CRM.', 'getRenewalAccounts'],
  ['/api/crm/org', 'get', 'CRM', 'Get CRM Organization', 'Returns organization information from Zoho CRM.', 'getOrg']
];
crmPaths.forEach(([pathName, method, tag, summary, description, operationId]) => addPath(pathName, method, tag, summary, description, operationId));

const booksPaths = [
  ['/api/books/customers', 'get', 'Books', 'List Zoho Books Customers', 'Returns all customers from Zoho Books.', 'getBooksCustomers'],
  ['/api/books/customers/{customerId}', 'get', 'Books', 'Get Zoho Books Customer', 'Returns a customer by ID from Zoho Books.', 'getBooksCustomerById', [{ name: 'customerId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/books/invoices', 'get', 'Books', 'List Zoho Books Invoices', 'Returns invoices from Zoho Books.', 'getBooksInvoices'],
  ['/api/books/invoices/{invoiceId}', 'get', 'Books', 'Get Zoho Books Invoice', 'Returns an invoice by ID from Zoho Books.', 'getBooksInvoiceById', [{ name: 'invoiceId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/books/estimates', 'get', 'Books', 'List Zoho Books Estimates', 'Returns estimates from Zoho Books.', 'getBooksEstimates'],
  ['/api/books/salesorders', 'get', 'Books', 'List Zoho Books Sales Orders', 'Returns sales orders from Zoho Books.', 'getBooksSalesOrders'],
  ['/api/books/purchaseorders', 'get', 'Books', 'List Zoho Books Purchase Orders', 'Returns purchase orders from Zoho Books.', 'getBooksPurchaseOrders'],
  ['/api/books/bills', 'get', 'Books', 'List Zoho Books Bills', 'Returns bills from Zoho Books.', 'getBooksBills'],
  ['/api/books/vendors', 'get', 'Books', 'List Zoho Books Vendors', 'Returns vendors from Zoho Books.', 'getBooksVendors'],
  ['/api/books/items', 'get', 'Books', 'List Zoho Books Items', 'Returns items from Zoho Books.', 'getBooksItems'],
  ['/api/books/payments', 'get', 'Books', 'List Zoho Books Payments', 'Returns payments from Zoho Books.', 'getBooksPayments'],
  ['/api/books/contacts', 'get', 'Books', 'List Zoho Books Contacts', 'Returns contacts from Zoho Books.', 'getBooksContacts']
];
booksPaths.forEach(([pathName, method, tag, summary, description, operationId, params]) => addPath(pathName, method, tag, summary, description, operationId, params || []));

const inventoryPaths = [
  ['/api/inventory/items', 'get', 'Inventory', 'List Zoho Inventory Items', 'Returns all items from Zoho Inventory.', 'getInventoryItems'],
  ['/api/inventory/items/{itemId}', 'get', 'Inventory', 'Get Zoho Inventory Item', 'Returns an item by ID from Zoho Inventory.', 'getInventoryItemById', [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/inventory/warehouses', 'get', 'Inventory', 'List Zoho Inventory Warehouses', 'Returns warehouses from Zoho Inventory.', 'getInventoryWarehouses'],
  ['/api/inventory/salesorders', 'get', 'Inventory', 'List Zoho Inventory Sales Orders', 'Returns sales orders from Zoho Inventory.', 'getInventorySalesOrders'],
  ['/api/inventory/purchaseorders', 'get', 'Inventory', 'List Zoho Inventory Purchase Orders', 'Returns purchase orders from Zoho Inventory.', 'getInventoryPurchaseOrders'],
  ['/api/inventory/packages', 'get', 'Inventory', 'List Zoho Inventory Packages', 'Returns packages from Zoho Inventory.', 'getInventoryPackages'],
  ['/api/inventory/shipments', 'get', 'Inventory', 'List Zoho Inventory Shipments', 'Returns shipments from Zoho Inventory.', 'getInventoryShipments'],
  ['/api/inventory/compositeitems', 'get', 'Inventory', 'List Zoho Inventory Composite Items', 'Returns composite items from Zoho Inventory.', 'getInventoryCompositeItems'],
  ['/api/inventory/contacts', 'get', 'Inventory', 'List Zoho Inventory Contacts', 'Returns contacts from Zoho Inventory.', 'getInventoryContacts']
];
inventoryPaths.forEach(([pathName, method, tag, summary, description, operationId, params]) => addPath(pathName, method, tag, summary, description, operationId, params || []));

const peoplePaths = [
  ['/api/people/employees', 'get', 'People', 'List Zoho People Employees', 'Returns employees from Zoho People.', 'getPeopleEmployees'],
  ['/api/people/employees/{employeeId}', 'get', 'People', 'Get Zoho People Employee', 'Returns an employee by ID from Zoho People.', 'getPeopleEmployeeById', [{ name: 'employeeId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/people/departments', 'get', 'People', 'List Zoho People Departments', 'Returns departments from Zoho People.', 'getPeopleDepartments'],
  ['/api/people/designations', 'get', 'People', 'List Zoho People Designations', 'Returns designations from Zoho People.', 'getPeopleDesignations'],
  ['/api/people/attendance', 'get', 'People', 'List Zoho People Attendance Records', 'Returns attendance records from Zoho People.', 'getPeopleAttendance'],
  ['/api/people/leave-requests', 'get', 'People', 'List Zoho People Leave Requests', 'Returns leave requests from Zoho People.', 'getPeopleLeaveRequests'],
  ['/api/people/holidays', 'get', 'People', 'List Zoho People Holidays', 'Returns holidays from Zoho People.', 'getPeopleHolidays'],
  ['/api/people/shifts', 'get', 'People', 'List Zoho People Shifts', 'Returns shifts from Zoho People.', 'getPeopleShifts']
];
peoplePaths.forEach(([pathName, method, tag, summary, description, operationId, params]) => addPath(pathName, method, tag, summary, description, operationId, params || []));

const analyticsPaths = [
  ['/api/analytics/workspaces', 'get', 'Analytics', 'List Zoho Analytics Workspaces', 'Returns workspaces from Zoho Analytics.', 'getAnalyticsWorkspaces'],
  ['/api/analytics/workspaces/{workspaceId}/views', 'get', 'Analytics', 'List Zoho Analytics Views', 'Returns views for a workspace.', 'getAnalyticsViews', [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/analytics/workspaces/{workspaceId}/tables', 'get', 'Analytics', 'List Zoho Analytics Tables', 'Returns tables for a workspace.', 'getAnalyticsTables', [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/analytics/workspaces/{workspaceId}/tables/{tableId}', 'get', 'Analytics', 'Get Zoho Analytics Table Metadata', 'Returns metadata for a table.', 'getAnalyticsTableMetadata', [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'tableId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/analytics/workspaces/{workspaceId}/tables/{tableId}/data', 'get', 'Analytics', 'Fetch Zoho Analytics Table Data', 'Returns data for a table.', 'getAnalyticsTableData', [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'tableId', in: 'path', required: true, schema: { type: 'string' } }]],
  ['/api/analytics/workspaces/{workspaceId}/query', 'post', 'Analytics', 'Execute Zoho Analytics Query', 'Executes a read-only query against Zoho Analytics.', 'executeAnalyticsQuery', [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }]]
];
analyticsPaths.forEach(([pathName, method, tag, summary, description, operationId, params]) => addPath(pathName, method, tag, summary, description, operationId, params || []));

fs.writeFileSync(path.join(__dirname, 'openapi.json'), JSON.stringify(spec, null, 2) + '\n');
console.log('Updated openapi.json');
