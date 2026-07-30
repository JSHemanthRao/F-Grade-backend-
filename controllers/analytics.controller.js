const {
  getWorkspaces: getWorkspacesService,
  getViews: getViewsService,
  getTables: getTablesService,
  getTableMetadata: getTableMetadataService,
  getTableData: getTableDataService,
  executeQuery: executeQueryService,
} = require('../services/analytics.service');

async function getAllWorkspaces(req, res) {
  try {
    const data = await getWorkspacesService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch workspaces.' });
  }
}

async function getAllViews(req, res) {
  try {
    const data = await getViewsService(req.params.workspaceId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch views.' });
  }
}

async function getAllTables(req, res) {
  try {
    const data = await getTablesService(req.params.workspaceId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch tables.' });
  }
}

async function getTableMetadata(req, res) {
  try {
    const data = await getTableMetadataService(req.params.workspaceId, req.params.tableId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch table metadata.' });
  }
}

async function getTableData(req, res) {
  try {
    const data = await getTableDataService(req.params.workspaceId, req.params.tableId, req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch table data.' });
  }
}

async function runQuery(req, res) {
  try {
    const data = await executeQueryService(req.params.workspaceId, req.body?.query, req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to execute query.' });
  }
}

module.exports = {
  getAllWorkspaces,
  getAllViews,
  getAllTables,
  getTableMetadata,
  getTableData,
  runQuery,
};
