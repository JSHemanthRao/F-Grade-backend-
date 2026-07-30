const express = require('express');
const {
  getAllLeads,
  getAllContacts,
  getAllAccounts,
  getAllDeals,
  getAllTasks,
  getAllEvents,
  getAllCalls,
  getAllMeetings,
  getAllNotes,
  getAllProducts,
  getAllVendors,
  getAllQuotes,
  getAllSalesOrders,
  getAllPurchaseOrders,
  getAllCampaigns,
  getAllCases,
  getAllSolutions,
  getAllUsers,
  getRenewalAccounts,
  getAllOrg,
} = require('../controllers/crm.controller');

const router = express.Router();

router.get('/leads', getAllLeads);
router.get('/contacts', getAllContacts);
router.get('/accounts', getAllAccounts);
router.get('/deals', getAllDeals);
router.get('/tasks', getAllTasks);
router.get('/events', getAllEvents);
router.get('/calls', getAllCalls);
router.get('/meetings', getAllMeetings);
router.get('/notes', getAllNotes);
router.get('/products', getAllProducts);
router.get('/vendors', getAllVendors);
router.get('/quotes', getAllQuotes);
router.get('/salesorders', getAllSalesOrders);
router.get('/purchaseorders', getAllPurchaseOrders);
router.get('/campaigns', getAllCampaigns);
router.get('/cases', getAllCases);
router.get('/solutions', getAllSolutions);
router.get('/users', getAllUsers);
router.get('/renewal-accounts', getRenewalAccounts);
router.get('/org', getAllOrg);

module.exports = router;
