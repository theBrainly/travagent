const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentBookings } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const { TTL } = require('../services/cacheService');

router.use(protect);

router.get('/stats', cacheMiddleware('dashboard:stats', TTL.SHORT), getDashboardStats);
router.get('/recent-bookings', cacheMiddleware('dashboard:recent', TTL.SHORT), getRecentBookings);

module.exports = router;
