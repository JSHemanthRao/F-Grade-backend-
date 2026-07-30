const express = require('express');
const {
  getAllWorkspaces,
  getAllViews,
  getAllTables,
  getTableMetadata,
  getTableData,
  runQuery,
} = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/workspaces', getAllWorkspaces);
router.get('/workspaces/:workspaceId/views', getAllViews);
router.get('/workspaces/:workspaceId/tables', getAllTables);
router.get('/workspaces/:workspaceId/tables/:tableId', getTableMetadata);
router.get('/workspaces/:workspaceId/tables/:tableId/data', getTableData);
router.post('/workspaces/:workspaceId/query', runQuery);

module.exports = router;
