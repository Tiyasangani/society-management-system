const express = require('express');
const router = express.Router();
const {
  createComplaint, listComplaints, updateComplaintStatus, getComplaintHistory,
} = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.post('/', authorize('resident'), upload.array('images', 5), createComplaint);
router.get('/', listComplaints); // all roles, filtered by ownership inside controller
router.get('/:id/history', getComplaintHistory);
router.patch('/:id/status', authorize('admin', 'committee'), updateComplaintStatus);

module.exports = router;
