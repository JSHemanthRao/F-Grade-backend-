const {
  getLeads,
  getContacts,
  getAccounts,
  getDeals,
  getTasks,
  getEvents,
  getCalls,
  getMeetings,
  getNotes,
  getProducts,
  getVendors,
  getQuotes,
  getSalesOrders,
  getPurchaseOrders,
  getCampaigns,
  getCases,
  getSolutions,
  getUsers,
  getRenewalAccounts: getRenewalAccountsService,
  getOrg,
} = require('../services/crm.service');

async function getAllLeads(req, res) {
  try {
    const data = await getLeads();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch leads.',
    });
  }
}

async function getAllContacts(req, res) {
  try {
    const data = await getContacts();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch contacts.',
    });
  }
}

async function getAllAccounts(req, res) {
  try {
    const data = await getAccounts();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch accounts.',
    });
  }
}

async function getAllDeals(req, res) {
  try {
    const data = await getDeals();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch deals.',
    });
  }
}

async function getAllTasks(req, res) {
  try {
    const data = await getTasks();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch tasks.',
    });
  }
}

async function getAllEvents(req, res) {
  try {
    const data = await getEvents();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch events.',
    });
  }
}

async function getAllCalls(req, res) {
  try {
    const data = await getCalls();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch calls.',
    });
  }
}

async function getAllMeetings(req, res) {
  try {
    const data = await getMeetings();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch meetings.',
    });
  }
}

async function getAllNotes(req, res) {
  try {
    const data = await getNotes();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch notes.',
    });
  }
}

async function getAllProducts(req, res) {
  try {
    const data = await getProducts();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch products.',
    });
  }
}

async function getAllVendors(req, res) {
  try {
    const data = await getVendors();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch vendors.',
    });
  }
}

async function getAllQuotes(req, res) {
  try {
    const data = await getQuotes();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch quotes.',
    });
  }
}

async function getAllSalesOrders(req, res) {
  try {
    const data = await getSalesOrders();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch sales orders.',
    });
  }
}

async function getAllPurchaseOrders(req, res) {
  try {
    const data = await getPurchaseOrders();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch purchase orders.',
    });
  }
}

async function getAllCampaigns(req, res) {
  try {
    const data = await getCampaigns();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch campaigns.',
    });
  }
}

async function getAllCases(req, res) {
  try {
    const data = await getCases();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch cases.',
    });
  }
}

async function getAllSolutions(req, res) {
  try {
    const data = await getSolutions();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch solutions.',
    });
  }
}

async function getAllUsers(req, res) {
  try {
    const data = await getUsers();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch users.',
    });
  }
}

async function getRenewalAccounts(req, res) {
  try {
    const data = await getRenewalAccountsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch renewal accounts.',
    });
  }
}

async function getAllOrg(req, res) {
  try {
    const data = await getOrg();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to fetch organization information.',
    });
  }
}

module.exports = {
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
};
