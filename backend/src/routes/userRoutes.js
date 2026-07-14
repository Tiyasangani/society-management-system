const express = require('express');
const router = express.Router();
const {
  listResidents, createResident, updateResident, deactivateResident,
  listCommittee, createCommitteeMember,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Residents - admin & committee can view, only admin can manage
router.get('/residents', authorize('admin', 'committee'), listResidents);
router.post('/residents', authorize('admin'), createResident);
router.put('/residents/:id', authorize('admin'), updateResident);
router.delete('/residents/:id', authorize('admin'), deactivateResident);

// Committee members - admin manages, everyone can view
router.get('/committee', listCommittee);
router.post('/committee', authorize('admin'), createCommitteeMember);

module.exports = router;
