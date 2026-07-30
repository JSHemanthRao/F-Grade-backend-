const express = require('express');
const {
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
} = require('../controllers/books.controller');

const router = express.Router();

router.get('/customers', getAllCustomers);
router.get('/customers/:customerId', getCustomerById);
router.get('/invoices', getAllInvoices);
router.get('/invoices/:invoiceId', getInvoiceById);
router.get('/estimates', getAllEstimates);
router.get('/salesorders', getAllSalesOrders);
router.get('/purchaseorders', getAllPurchaseOrders);
router.get('/bills', getAllBills);
router.get('/vendors', getAllVendors);
router.get('/items', getAllItems);
router.get('/payments', getAllPayments);
router.get('/contacts', getAllContacts);

module.exports = router;
