const {
  getCustomers: getCustomersService,
  getCustomerById: getCustomerByIdService,
  getInvoices: getInvoicesService,
  getInvoiceById: getInvoiceByIdService,
  getEstimates: getEstimatesService,
  getSalesOrders: getSalesOrdersService,
  getPurchaseOrders: getPurchaseOrdersService,
  getBills: getBillsService,
  getVendors: getVendorsService,
  getItems: getItemsService,
  getPayments: getPaymentsService,
  getContacts: getContactsService,
} = require('../services/books.service');

async function getAllCustomers(req, res) {
  try {
    const data = await getCustomersService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch customers.' });
  }
}

async function getCustomerById(req, res) {
  try {
    const data = await getCustomerByIdService(req.params.customerId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch customer.' });
  }
}

async function getAllInvoices(req, res) {
  try {
    const data = await getInvoicesService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch invoices.' });
  }
}

async function getInvoiceById(req, res) {
  try {
    const data = await getInvoiceByIdService(req.params.invoiceId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch invoice.' });
  }
}

async function getAllEstimates(req, res) {
  try {
    const data = await getEstimatesService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch estimates.' });
  }
}

async function getAllSalesOrders(req, res) {
  try {
    const data = await getSalesOrdersService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch sales orders.' });
  }
}

async function getAllPurchaseOrders(req, res) {
  try {
    const data = await getPurchaseOrdersService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch purchase orders.' });
  }
}

async function getAllBills(req, res) {
  try {
    const data = await getBillsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch bills.' });
  }
}

async function getAllVendors(req, res) {
  try {
    const data = await getVendorsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch vendors.' });
  }
}

async function getAllItems(req, res) {
  try {
    const data = await getItemsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch items.' });
  }
}

async function getAllPayments(req, res) {
  try {
    const data = await getPaymentsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch payments.' });
  }
}

async function getAllContacts(req, res) {
  try {
    const data = await getContactsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch contacts.' });
  }
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  getAllInvoices,
  getInvoiceById,
  getAllEstimates,
  getAllSalesOrders,
  getAllPurchaseOrders,
  getAllBills,
  getAllVendors,
  getAllItems,
  getAllPayments,
  getAllContacts,
};
