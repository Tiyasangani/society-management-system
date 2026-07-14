const express = require('express');
const router = express.Router();
const {
  createServiceRequest, listServiceRequests, updateServiceRequestStatus,
} = require('../controllers/serviceRequestController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('resident'), createServiceRequest);
router.get('/', listServiceRequests);
router.patch('/:id/status', authorize('admin', 'committee'), updateServiceRequestStatus);

module.exports = router;
