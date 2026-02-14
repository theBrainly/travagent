// controllers/paymentController.js
const PaymentService = require('../services/paymentService');
const ApiResponse = require('../utils/apiResponse');
const { hasPermission } = require('../config/role');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { CacheService } = require('../services/cacheService');

exports.processPayment = async (req, res, next) => {
  try {
    req.body.agentRole = req.agent.role;
    const payment = await PaymentService.processPayment(req.body, req.agent._id);

    if (payment.status === 'completed') {
      // Audit log
      AuditService.logCreate(req, 'Payment', payment._id, `Payment of ₹${payment.amount} processed via ${payment.paymentMethod}. TXN: ${payment.transactionId}`);

      // Notification
      NotificationService.onPaymentReceived(payment, req.agent._id);

      // Invalidate cache
      CacheService.invalidate('payment');

      ApiResponse.created(res, { payment }, 'Payment processed');
    } else {
      // Log failed payment
      AuditService.log({
        action: 'PAYMENT_FAILED',
        performedBy: req.agent._id,
        performedByRole: req.agent.role,
        targetModel: 'Payment',
        targetId: payment._id,
        metadata: AuditService.getMetadata(req),
        description: `Payment of ₹${payment.amount} failed`,
        severity: 'warning'
      });

      ApiResponse.error(res, 'Payment failed', 400, { payment });
    }
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const { payments, pagination } = await PaymentService.getPayments(req.agent._id, req.agent.role, req.query);
    ApiResponse.paginated(res, payments, pagination);
  } catch (error) { next(error); }
};

exports.getPayment = async (req, res, next) => {
  try {
    const payment = await PaymentService.getPaymentById(req.params.id);
    if (!hasPermission(req.agent.role, 'canViewAllPayments') && payment.agent._id.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized to view this payment', 403);
    ApiResponse.success(res, { payment });
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.processRefund = async (req, res, next) => {
  try {
    const refund = await PaymentService.processRefund(req.params.id, req.body, req.agent._id);

    // Audit log (critical action)
    AuditService.logCritical(req, 'PAYMENT_REFUNDED', 'Payment', refund._id,
      `Refund of ₹${refund.refundDetails?.refundAmount} processed. Reason: ${refund.refundDetails?.refundReason || 'N/A'}`,
      { before: { status: 'completed' }, after: { status: 'refunded' } }
    );

    // Notification
    NotificationService.onPaymentRefunded(refund, refund.agent?._id || req.agent._id);

    // Invalidate cache
    CacheService.invalidate('payment');

    ApiResponse.created(res, { refund }, 'Refund processed');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.getPaymentStats = async (req, res, next) => {
  try {
    const Payment = require('../models/Payment');
    const filter = !hasPermission(req.agent.role, 'canViewAllPayments') ? { agent: req.agent._id } : {};
    const stats = await Payment.aggregate([{ $match: { ...filter, status: 'completed', amount: { $gt: 0 } } }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }]);
    const monthlyRevenue = await Payment.aggregate([{ $match: { ...filter, status: 'completed', amount: { $gt: 0 } } }, { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': -1, '_id.month': -1 } }, { $limit: 12 }]);
    ApiResponse.success(res, { paymentMethodStats: stats, monthlyRevenue });
  } catch (error) { next(error); }
};