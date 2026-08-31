const express = require('express');
const { getStats } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('super_admin', 'admin', 'editor'));
router.get('/stats', getStats);

module.exports = router;
