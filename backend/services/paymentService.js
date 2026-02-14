// services/paymentService.js
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const ConflictService = require('./conflictService');
const { generateRefNumber, buildPagination } = require('../utils/helpers');
const { hasPermission } = require('../config/role');

class PaymentService {
  static async simulateGatewayPayment() {
    await new Promise(r => setTimeout(r, 100));
    const isSuccess = Math.random() < 0.95;
    return {
      success: isSuccess,
      gatewayTransactionId: `GW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gatewayName: 'SimulatedGateway',
      responseCode: isSuccess ? '00' : 'E1',
      responseMessage: isSuccess ? 'Transaction successful' : 'Transaction failed',
      processedAt: new Date()
    };
  }

  static async processPayment(paymentData, agentId) {
    const booking = await Booking.findById(paymentData.booking);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (!hasPermission(paymentData.agentRole, 'canViewAllBookings') && booking.agent.toString() !== agentId.toString()) {
      throw { statusCode: 403, message: 'Not authorized' };
    }
    if (['cancelled', 'refunded'].includes(booking.status)) throw { statusCode: 400, message: `Cannot pay for ${booking.status} booking` };

    const amountDue = booking.pricing.totalAmount - booking.amountPaid;
    if (paymentData.amount > amountDue) throw { statusCode: 400, message: `Amount exceeds due (${amountDue})` };

    // Step 5: Duplicate payment detection
    const duplicate = await ConflictService.checkDuplicatePayment(booking._id, paymentData.amount);
    if (duplicate) {
      throw {
        statusCode: 409,
        message: `Duplicate payment detected: A payment of ₹${duplicate.amount} for this booking was already completed at ${new Date(duplicate.createdAt).toLocaleString()} (TXN: ${duplicate.transactionId}). Please wait 5 minutes before retrying.`
      };
    }

    let paymentType = 'partial';
    if (paymentData.amount === booking.pricing.totalAmount) paymentType = 'full';
    else if (booking.amountPaid === 0) paymentType = 'advance';
    else if (paymentData.amount === amountDue) paymentType = 'balance';

    const payment = new Payment({
      booking: booking._id, agent: agentId, customer: booking.customer,
      amount: paymentData.amount, paymentMethod: paymentData.paymentMethod,
      paymentType, status: 'processing', processedBy: agentId
    });

    const gatewayResponse = await this.simulateGatewayPayment();
    payment.gatewayResponse = gatewayResponse;

    if (gatewayResponse.success) {
      payment.status = 'completed';
      payment.receipt = { receiptNumber: generateRefNumber('RCP'), generatedAt: new Date() };
      booking.amountPaid += paymentData.amount;
      booking.amountDue = booking.pricing.totalAmount - booking.amountPaid;
      booking.paymentStatus = booking.amountDue <= 0 ? 'paid' : 'partially_paid';

      if (booking.paymentStatus === 'paid' && booking.status === 'pending') {
        booking.status = 'confirmed';
        booking.statusHistory.push({ status: 'confirmed', changedAt: new Date(), changedBy: agentId, notes: 'Auto-confirmed after full payment' });
      }
      await booking.save();
    } else {
      payment.status = 'failed';
    }

    await payment.save();
    return payment;
  }

  static async processRefund(paymentId, refundData, agentId) {
    const original = await Payment.findById(paymentId);
    if (!original) throw { statusCode: 404, message: 'Payment not found' };
    if (original.status !== 'completed') throw { statusCode: 400, message: 'Can only refund completed payments' };

    const refundAmount = refundData.amount || original.amount;
    if (refundAmount > original.amount) throw { statusCode: 400, message: 'Refund exceeds original amount' };

    const refundPayment = await Payment.create({
      booking: original.booking, agent: agentId, customer: original.customer,
      amount: -refundAmount, paymentMethod: original.paymentMethod, paymentType: 'refund',
      status: 'completed', processedBy: agentId,
      refundDetails: { refundAmount, refundReason: refundData.reason, refundedAt: new Date(), originalTransactionId: original.transactionId },
      gatewayResponse: { gatewayTransactionId: `REF-${Date.now()}`, gatewayName: 'SimulatedGateway', responseCode: '00', responseMessage: 'Refund processed', processedAt: new Date() }
    });

    original.status = 'refunded';
    await original.save();

    const booking = await Booking.findById(original.booking);
    if (booking) {
      booking.amountPaid -= refundAmount;
      booking.amountDue = booking.pricing.totalAmount - booking.amountPaid;
      booking.paymentStatus = booking.amountPaid <= 0 ? 'refunded' : 'partially_paid';
      await booking.save();
    }

    return refundPayment;
  }

  static async getPayments(agentId, agentRole, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    let filter = {};
    if (!hasPermission(agentRole, 'canViewAllPayments')) filter.agent = agentId;

    // Step 6: Advanced filters
    if (query.status) {
      filter.status = query.status.includes(',')
        ? { $in: query.status.split(',').map(s => s.trim()) }
        : query.status;
    }
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
    if (query.booking) filter.booking = query.booking;

    // Amount range
    if (query.minAmount || query.maxAmount) {
      filter.amount = {};
      if (query.minAmount) filter.amount.$gte = parseFloat(query.minAmount);
      if (query.maxAmount) filter.amount.$lte = parseFloat(query.maxAmount);
    }

    // Date range
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
    }

    const total = await Payment.countDocuments(filter);
    const { pagination, startIndex } = buildPagination(page, limit, total);

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? '' : '-';
    const sortStr = `${sortOrder}${sortBy}`;

    const payments = await Payment.find(filter)
      .populate('booking', 'bookingReference tripDetails.title')
      .populate('agent', 'firstName lastName')
      .populate('customer', 'firstName lastName email')
      .sort(sortStr).skip(startIndex).limit(limit);

    return { payments, pagination };
  }

  static async getPaymentById(paymentId) {
    const payment = await Payment.findById(paymentId)
      .populate('booking', 'bookingReference tripDetails pricing status')
      .populate('agent', 'firstName lastName email')
      .populate('customer', 'firstName lastName email phone');
    if (!payment) throw { statusCode: 404, message: 'Payment not found' };
    return payment;
  }
}

module.exports = PaymentService;