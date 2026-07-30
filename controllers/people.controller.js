const {
  getEmployees: getEmployeesService,
  getEmployeeById: getEmployeeByIdService,
  getDepartments: getDepartmentsService,
  getDesignations: getDesignationsService,
  getAttendanceRecords: getAttendanceRecordsService,
  getLeaveRequests: getLeaveRequestsService,
  getHolidays: getHolidaysService,
  getShifts: getShiftsService,
} = require('../services/people.service');

async function getAllEmployees(req, res) {
  try {
    const data = await getEmployeesService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch employees.' });
  }
}

async function getEmployeeById(req, res) {
  try {
    const data = await getEmployeeByIdService(req.params.employeeId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch employee.' });
  }
}

async function getAllDepartments(req, res) {
  try {
    const data = await getDepartmentsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch departments.' });
  }
}

async function getAllDesignations(req, res) {
  try {
    const data = await getDesignationsService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch designations.' });
  }
}

async function getAllAttendanceRecords(req, res) {
  try {
    const data = await getAttendanceRecordsService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch attendance records.' });
  }
}

async function getAllLeaveRequests(req, res) {
  try {
    const data = await getLeaveRequestsService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch leave requests.' });
  }
}

async function getAllHolidays(req, res) {
  try {
    const data = await getHolidaysService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch holidays.' });
  }
}

async function getAllShifts(req, res) {
  try {
    const data = await getShiftsService(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch shifts.' });
  }
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getAllDepartments,
  getAllDesignations,
  getAllAttendanceRecords,
  getAllLeaveRequests,
  getAllHolidays,
  getAllShifts,
};
