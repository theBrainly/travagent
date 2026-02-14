// controllers/commissionController.js
const CommissionService = require('../services/commissionService');
const Commission = require('../models/Commission');
const ApiResponse = require('../utils/apiResponse');
const { hasPermission } = require('../config/role');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { CacheService } = require('../services/cacheService');

exports.getCommissions = async (req, res, next) => {
  try {
    const { commissions, pagination } = await CommissionService.getAgentCommissions(req.agent._id, req.agent.role, req.query);
    ApiResponse.paginated(res, commissions, pagination);
  } catch (error) { next(error); }
};

exports.getCommissionsByAgent = async (req, res, next) => {
  try {
    req.query.agentId = req.params.id;
    await exports.getCommissions(req, res, next);
  } catch (error) { next(error); }
};

exports.getCommission = async (req, res, next) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('agent', 'firstName lastName email commissionRate')
      .populate('booking', 'bookingReference tripDetails pricing status')
      .populate('approvedBy', 'firstName lastName');
    if (!commission) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canApproveCommissions') && commission.agent._id.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized to view this commission', 403);
    ApiResponse.success(res, { commission });
  } catch (error) { next(error); }
};

exports.approveCommission = async (req, res, next) => {
  try {
    const commission = await CommissionService.approveCommission(req.params.id, req.agent._id);

    // Audit log
    AuditService.log({
      action: 'COMMISSION_APPROVED',
      performedBy: req.agent._id,
      performedByRole: req.agent.role,
      targetModel: 'Commission',
      targetId: commission._id,
      changes: { before: { status: 'pending' }, after: { status: 'approved' } },
      metadata: AuditService.getMetadata(req),
      description: `Approved commission of ₹${commission.totalEarning} for agent`,
      severity: 'info'
    });

    // Notification to the agent
    NotificationService.onCommissionApproved(commission, commission.agent?._id || commission.agent);

    // Invalidate cache
    CacheService.invalidate('commission');

    ApiResponse.success(res, { commission }, 'Approved');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.markCommissionPaid = async (req, res, next) => {
  try {
    const commission = await CommissionService.markCommissionPaid(req.params.id, req.body, req.agent._id);

    // Audit log
    AuditService.log({
      action: 'COMMISSION_PAID',
      performedBy: req.agent._id,
      performedByRole: req.agent.role,
      targetModel: 'Commission',
      targetId: commission._id,
      changes: { before: { status: 'approved' }, after: { status: 'paid' } },
      metadata: AuditService.getMetadata(req),
      description: `Commission of ₹${commission.totalEarning} marked as paid`,
      severity: 'info'
    });

    // Notification to the agent
    NotificationService.onCommissionPaid(commission, commission.agent?._id || commission.agent);

    // Invalidate cache
    CacheService.invalidate('commission');

    ApiResponse.success(res, { commission }, 'Paid');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.getCommissionSummary = async (req, res, next) => {
  try {
    const summary = await CommissionService.getCommissionSummary(req.agent._id, req.agent.role);
    ApiResponse.success(res, summary);
  } catch (error) { next(error); }
};