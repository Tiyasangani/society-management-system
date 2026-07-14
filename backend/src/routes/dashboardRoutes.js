const express = require('express');
const router = express.Router();
const { getSummary, getAuditLogs } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/audit-logs', authorize('admin'), getAuditLogs);

module.exports = router;
