const express = require('express');
const router = express.Router();
const { createBill, bulkGenerateBills, listBills } = require('../controllers/billingController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('admin'), createBill);
router.post('/bulk', authorize('admin'), bulkGenerateBills);
router.get('/', listBills);

module.exports = router;
