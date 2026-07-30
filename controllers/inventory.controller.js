const {
  getItems: getItemsService,
  getItemById: getItemByIdService,
  getWarehouses: getWarehousesService,
  getSalesOrders: getSalesOrdersService,
  getPurchaseOrders: getPurchaseOrdersService,
  getPackages: getPackagesService,
  getShipments: getShipmentsService,
  getCompositeItems: getCompositeItemsService,
  getContacts: getContactsService,
} = require('../services/inventory.service');

async function getAllItems(req, res) {
  try {
    const data = await getItemsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch items.' });
  }
}

async function getItemById(req, res) {
  try {
    const data = await getItemByIdService(req.params.itemId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch item.' });
  }
}

async function getAllWarehouses(req, res) {
  try {
    const data = await getWarehousesService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch warehouses.' });
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

async function getAllPackages(req, res) {
  try {
    const data = await getPackagesService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch packages.' });
  }
}

async function getAllShipments(req, res) {
  try {
    const data = await getShipmentsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch shipments.' });
  }
}

async function getAllCompositeItems(req, res) {
  try {
    const data = await getCompositeItemsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch composite items.' });
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
  getAllItems,
  getItemById,
  getAllWarehouses,
  getAllSalesOrders,
  getAllPurchaseOrders,
  getAllPackages,
  getAllShipments,
  getAllCompositeItems,
  getAllContacts,
};
