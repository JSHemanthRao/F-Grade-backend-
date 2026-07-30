const express = require('express');
const {
  getAllEmployees,
  getEmployeeById,
  getAllDepartments,
  getAllDesignations,
  getAllAttendanceRecords,
  getAllLeaveRequests,
  getAllHolidays,
  getAllShifts,
} = require('../controllers/people.controller');

const router = express.Router();

router.get('/employees', getAllEmployees);
router.get('/employees/:employeeId', getEmployeeById);
router.get('/departments', getAllDepartments);
router.get('/designations', getAllDesignations);
router.get('/attendance', getAllAttendanceRecords);
router.get('/leave-requests', getAllLeaveRequests);
router.get('/holidays', getAllHolidays);
router.get('/shifts', getAllShifts);

module.exports = router;
