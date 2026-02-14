// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { requireMinLevel } = require('../middleware/roleCheck');
const { cacheMiddleware } = require('../middleware/cache');
const { TTL } = require('../services/cacheService');
const ctrl = require('../controllers/bookingController');

router.use(protect);
router.get('/stats', cacheMiddleware('bookings:stats', TTL.SHORT), ctrl.getBookingStats);
router.route('/')
  .get(cacheMiddleware('bookings:list', TTL.MEDIUM), ctrl.getBookings)
  .post(requireMinLevel(2), [
    body('customer').notEmpty(), body('bookingType').notEmpty(),
    body('tripDetails.title').notEmpty(), body('tripDetails.destination').notEmpty(),
    body('tripDetails.startDate').isISO8601(), body('tripDetails.endDate').isISO8601(),
    body('pricing.basePrice').isNumeric(), body('pricing.totalAmount').isNumeric(), validate
  ], ctrl.createBooking);
router.route('/:id').get(ctrl.getBooking).put(requireMinLevel(2), ctrl.updateBooking).delete(requireMinLevel(2), ctrl.deleteBooking);
router.patch('/:id/status', requireMinLevel(2), [body('status').notEmpty(), validate], ctrl.updateBookingStatus);

module.exports = router;