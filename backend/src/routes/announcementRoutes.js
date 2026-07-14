const express = require('express');
const router = express.Router();
const {
  createAnnouncement, listAnnouncements, deleteAnnouncement,
} = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('admin', 'committee'), createAnnouncement);
router.get('/', listAnnouncements);
router.delete('/:id', authorize('admin'), deleteAnnouncement);

module.exports = router;
