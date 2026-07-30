const express = require('express');
const {
  getAllItems,
  getItemById,
  getAllWarehouses,
  getAllSalesOrders,
  getAllPurchaseOrders,
  getAllPackages,
  getAllShipments,
  getAllCompositeItems,
  getAllContacts,
} = require('../controllers/inventory.controller');

const router = express.Router();

router.get('/items', getAllItems);
router.get('/items/:itemId', getItemById);
router.get('/warehouses', getAllWarehouses);
router.get('/salesorders', getAllSalesOrders);
router.get('/purchaseorders', getAllPurchaseOrders);
router.get('/packages', getAllPackages);
router.get('/shipments', getAllShipments);
router.get('/compositeitems', getAllCompositeItems);
router.get('/contacts', getAllContacts);

module.exports = router;
