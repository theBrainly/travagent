// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireMinLevel } = require('../middleware/roleCheck');
const { cacheMiddleware } = require('../middleware/cache');
const { TTL } = require('../services/cacheService');
const ctrl = require('../controllers/analyticsController');

router.use(protect);

// Overview — accessible by all authenticated users
router.get('/overview', cacheMiddleware('analytics:overview', TTL.SHORT), ctrl.getOverview);

// Detailed analytics — Admin+ only (level >= 4)
router.get('/revenue', requireMinLevel(4), cacheMiddleware('analytics:revenue', TTL.SHORT), ctrl.getRevenue);
router.get('/bookings', requireMinLevel(4), cacheMiddleware('analytics:bookings', TTL.SHORT), ctrl.getBookings);
router.get('/conversion', requireMinLevel(4), cacheMiddleware('analytics:conversion', TTL.SHORT), ctrl.getConversion);
router.get('/top-agents', requireMinLevel(4), cacheMiddleware('analytics:top-agents', TTL.SHORT), ctrl.getTopAgents);
router.get('/monthly-growth', requireMinLevel(4), cacheMiddleware('analytics:monthly-growth', TTL.SHORT), ctrl.getMonthlyGrowth);

module.exports = router;
