const express = require('express');
const router = express.Router();
const { listFlats, listBuildings, createBuilding, createFlat } = require('../controllers/flatController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', listFlats); // public - needed for registration form
router.get('/buildings', authenticate, authorize('admin'), listBuildings);
router.post('/buildings', authenticate, authorize('admin'), createBuilding);
router.post('/units', authenticate, authorize('admin'), createFlat);

module.exports = router;
