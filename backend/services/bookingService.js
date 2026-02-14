// services/bookingService.js
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Agent = require('../models/Agent');
const CommissionService = require('./commissionService');
const ConflictService = require('./conflictService');
const { hasPermission } = require('../config/role');
const { buildPagination, buildFilterQuery } = require('../utils/helpers');

class BookingService {
  static async createBooking(bookingData, agentId) {
    const customer = await Customer.findOne({ _id: bookingData.customer, agent: agentId });
    if (!customer) throw { statusCode: 404, message: 'Customer not found or does not belong to you' };

    // Step 5: Booking Conflict Protection
    const conflict = await ConflictService.checkBookingConflict(
      bookingData.customer,
      bookingData.tripDetails?.destination,
      bookingData.tripDetails?.startDate,
      bookingData.tripDetails?.endDate
    );
    if (conflict) {
      throw {
        statusCode: 409,
        message: `Booking conflict: Customer already has an active booking for ${conflict.tripDetails.destination} ` +
          `(${conflict.bookingReference}) with overlapping dates ` +
          `${new Date(conflict.tripDetails.startDate).toLocaleDateString()} - ${new Date(conflict.tripDetails.endDate).toLocaleDateString()}`
      };
    }

    const pricing = bookingData.pricing;
    pricing.totalAmount = pricing.basePrice + (pricing.taxes || 0) + (pricing.serviceCharge || 0) - (pricing.discount || 0);
    bookingData.agent = agentId;
    bookingData.statusHistory = [{ status: 'pending', changedAt: new Date(), changedBy: agentId, notes: 'Booking created' }];

    const booking = await Booking.create(bookingData);
    await Agent.findByIdAndUpdate(agentId, { $inc: { totalBookings: 1 } });
    return booking;
  }

  static async getBookings(agentId, agentRole, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    let filter = {};

    if (!hasPermission(agentRole, 'canViewAllBookings')) {
      filter.agent = agentId;
    } else if (query.agentId) {
      filter.agent = query.agentId;
    }

    // Step 6: Advanced filters
    // Status (comma-separated support)
    if (query.status) {
      filter.status = query.status.includes(',')
        ? { $in: query.status.split(',').map(s => s.trim()) }
        : query.status;
    }
    if (query.bookingType) filter.bookingType = query.bookingType;
    if (query.priority) {
      filter.priority = query.priority.includes(',')
        ? { $in: query.priority.split(',').map(s => s.trim()) }
        : query.priority;
    }
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    // Destination filter
    if (query.destination) {
      filter['tripDetails.destination'] = { $regex: query.destination, $options: 'i' };
    }

    // Trip type
    if (query.tripType) {
      filter['tripDetails.tripType'] = query.tripType.includes(',')
        ? { $in: query.tripType.split(',').map(s => s.trim()) }
        : query.tripType;
    }

    // Customer filter
    if (query.customer) filter.customer = query.customer;

    // Date range for trip start date
    if (query.startDateFrom || query.startDateTo) {
      filter['tripDetails.startDate'] = {};
      if (query.startDateFrom) filter['tripDetails.startDate'].$gte = new Date(query.startDateFrom);
      if (query.startDateTo) filter['tripDetails.startDate'].$lte = new Date(query.startDateTo);
    }

    // Amount range
    if (query.minAmount || query.maxAmount) {
      filter['pricing.totalAmount'] = {};
      if (query.minAmount) filter['pricing.totalAmount'].$gte = parseFloat(query.minAmount);
      if (query.maxAmount) filter['pricing.totalAmount'].$lte = parseFloat(query.maxAmount);
    }

    // Text search
    if (query.search) {
      filter.$or = [
        { bookingReference: { $regex: query.search, $options: 'i' } },
        { 'tripDetails.title': { $regex: query.search, $options: 'i' } },
        { 'tripDetails.destination': { $regex: query.search, $options: 'i' } }
      ];
    }

    const total = await Booking.countDocuments(filter);
    const { pagination, startIndex } = buildPagination(page, limit, total);

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? '' : '-';
    const sortStr = `${sortOrder}${sortBy}`;

    const bookings = await Booking.find(filter)
      .populate('agent', 'firstName lastName email')
      .populate('customer', 'firstName lastName email phone')
      .populate('itinerary', 'title')
      .sort(sortStr).skip(startIndex).limit(limit);

    return { bookings, pagination };
  }

  static async getBookingById(bookingId, agentId, agentRole) {
    const booking = await Booking.findById(bookingId)
      .populate('agent', 'firstName lastName email phone agencyName')
      .populate('customer', 'firstName lastName email phone address passportDetails')
      .populate('itinerary')
      .populate('lead', 'leadReference contactInfo')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate({ path: 'payments', select: 'transactionId amount status paymentMethod createdAt' });

    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (!hasPermission(agentRole, 'canViewAllBookings') && booking.agent._id.toString() !== agentId.toString()) {
      throw { statusCode: 403, message: 'Not authorized to view this booking' };
    }
    return booking;
  }

  static async updateBookingStatus(bookingId, newStatus, agentId, agentRole, reason = '') {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (!hasPermission(agentRole, 'canViewAllBookings') && booking.agent.toString() !== agentId.toString()) {
      throw { statusCode: 403, message: 'Not authorized' };
    }

    const validTransitions = {
      draft: ['pending', 'cancelled'], pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'], in_progress: ['completed', 'cancelled'],
      completed: ['refunded'], cancelled: ['pending'], refunded: []
    };

    if (!validTransitions[booking.status]?.includes(newStatus)) {
      throw { statusCode: 400, message: `Cannot transition from '${booking.status}' to '${newStatus}'` };
    }

    booking.status = newStatus;
    booking.statusHistory.push({ status: newStatus, changedAt: new Date(), changedBy: agentId, reason, notes: reason });

    if (newStatus === 'cancelled') {
      booking.cancellation = { cancelledAt: new Date(), cancelledBy: agentId, reason };
    }

    if (newStatus === 'completed') {
      await CommissionService.createCommission(booking, agentId);
      await Customer.findByIdAndUpdate(booking.customer, {
        $inc: { totalTrips: 1, totalSpent: booking.pricing.totalAmount, loyaltyPoints: Math.floor(booking.pricing.totalAmount / 100) }
      });
    }

    await booking.save();
    return booking;
  }

  static async updateBooking(bookingId, updateData, agentId, agentRole) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (!hasPermission(agentRole, 'canUpdateAnyBooking') && booking.agent.toString() !== agentId.toString()) {
      throw { statusCode: 403, message: 'Not authorized' };
    }
    if (!['draft', 'pending'].includes(booking.status)) {
      throw { statusCode: 400, message: `Cannot update booking with status '${booking.status}'` };
    }

    // Step 5: Conflict check when dates or destination change
    const newDest = updateData.tripDetails?.destination || booking.tripDetails.destination;
    const newStart = updateData.tripDetails?.startDate || booking.tripDetails.startDate;
    const newEnd = updateData.tripDetails?.endDate || booking.tripDetails.endDate;
    const conflict = await ConflictService.checkBookingConflict(
      booking.customer, newDest, newStart, newEnd, bookingId
    );
    if (conflict) {
      throw {
        statusCode: 409,
        message: `Booking conflict: Customer already has an active booking for ${conflict.tripDetails.destination} ` +
          `(${conflict.bookingReference}) with overlapping dates`
      };
    }

    delete updateData.bookingReference;
    delete updateData.agent;
    delete updateData.statusHistory;

    if (updateData.pricing) {
      const p = { ...booking.pricing.toObject(), ...updateData.pricing };
      updateData.pricing = p;
      updateData.pricing.totalAmount = p.basePrice + (p.taxes || 0) + (p.serviceCharge || 0) - (p.discount || 0);
    }

    return await Booking.findByIdAndUpdate(bookingId, updateData, { new: true, runValidators: true })
      .populate('customer', 'firstName lastName email')
      .populate('agent', 'firstName lastName');
  }

  static async deleteBooking(bookingId, agentId, agentRole) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (!hasPermission(agentRole, 'canDeleteAnyBooking') && booking.agent.toString() !== agentId.toString()) {
      throw { statusCode: 403, message: 'Not authorized' };
    }
    if (!['draft', 'cancelled'].includes(booking.status)) {
      throw { statusCode: 400, message: 'Only draft or cancelled bookings can be deleted' };
    }
    await Booking.findByIdAndDelete(bookingId);
    return { message: 'Booking deleted' };
  }

  static async getBookingStats(agentId, agentRole) {
    let match = {};
    if (!hasPermission(agentRole, 'canViewAllBookings')) match.agent = agentId;

    const stats = await Booking.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$pricing.totalAmount' } } }
    ]);

    const topDestinations = await Booking.aggregate([
      { $match: { ...match, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$tripDetails.destination', count: { $sum: 1 }, totalRevenue: { $sum: '$pricing.totalAmount' } } },
      { $sort: { count: -1 } }, { $limit: 10 }
    ]);

    return { statusBreakdown: stats, topDestinations };
  }
}

module.exports = BookingService;