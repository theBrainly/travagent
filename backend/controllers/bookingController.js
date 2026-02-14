// controllers/bookingController.js
const BookingService = require('../services/bookingService');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { CacheService } = require('../services/cacheService');

exports.createBooking = async (req, res, next) => {
  try {
    const booking = await BookingService.createBooking(req.body, req.agent._id);

    // Audit log
    AuditService.logCreate(req, 'Booking', booking._id, `Created booking ${booking.bookingReference} for ${booking.tripDetails?.destination}`);

    // Notification
    NotificationService.onBookingCreated(booking, req.agent._id);

    // Invalidate cache
    CacheService.invalidate('booking');

    ApiResponse.created(res, { booking });
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const { bookings, pagination } = await BookingService.getBookings(req.agent._id, req.agent.role, req.query);
    ApiResponse.paginated(res, bookings, pagination);
  } catch (error) { next(error); }
};

exports.getBooking = async (req, res, next) => {
  try {
    const booking = await BookingService.getBookingById(req.params.id, req.agent._id, req.agent.role);
    ApiResponse.success(res, { booking });
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await BookingService.updateBooking(req.params.id, req.body, req.agent._id, req.agent.role);

    // Audit log
    AuditService.logUpdate(req, 'Booking', booking._id, null, req.body, `Updated booking ${booking.bookingReference}`);

    // Invalidate cache
    CacheService.invalidate('booking');

    ApiResponse.success(res, { booking }, 'Updated');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!status) return ApiResponse.error(res, 'Status required', 400);

    // Get old status before update
    const Booking = require('../models/Booking');
    const oldBooking = await Booking.findById(req.params.id).select('status bookingReference');
    const oldStatus = oldBooking?.status;

    const booking = await BookingService.updateBookingStatus(req.params.id, status, req.agent._id, req.agent.role, reason);

    // Audit log
    AuditService.logStatusChange(req, 'Booking', booking._id, oldStatus, status, `Booking ${booking.bookingReference} status: ${oldStatus} → ${status}`);

    // Notifications based on new status
    if (status === 'confirmed') NotificationService.onBookingConfirmed(booking, req.agent._id);
    if (status === 'cancelled') NotificationService.onBookingCancelled(booking, req.agent._id);

    // Invalidate cache
    CacheService.invalidate('booking');

    ApiResponse.success(res, { booking }, `Status updated to '${status}'`);
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.deleteBooking = async (req, res, next) => {
  try {
    const result = await BookingService.deleteBooking(req.params.id, req.agent._id, req.agent.role);

    // Audit log
    AuditService.logDelete(req, 'Booking', req.params.id, `Deleted booking`);

    // Invalidate cache
    CacheService.invalidate('booking');

    ApiResponse.success(res, null, result.message);
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.getBookingStats = async (req, res, next) => {
  try {
    const stats = await BookingService.getBookingStats(req.agent._id, req.agent.role);
    ApiResponse.success(res, stats);
  } catch (error) { next(error); }
};