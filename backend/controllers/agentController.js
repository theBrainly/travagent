// controllers/agentController.js
const Agent = require('../models/Agent');
const ApiResponse = require('../utils/apiResponse');
const { getRoleLevel, hasPermission, canPromoteToRole, ROLE_PROMOTION_PERMISSIONS } = require('../config/role');
const { buildPagination } = require('../utils/helpers');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { CacheService } = require('../services/cacheService');

exports.getAllAgents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const total = await Agent.countDocuments(filter);
    const { pagination, startIndex } = buildPagination(page, limit, total);
    const agents = await Agent.find(filter).sort('-createdAt').skip(startIndex).limit(limit);
    ApiResponse.paginated(res, agents, pagination);
  } catch (error) { next(error); }
};

exports.getPendingAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find({ isActive: false, isVerified: false }).sort('-createdAt');
    ApiResponse.success(res, { agents, count: agents.length }, 'Pending agents');
  } catch (error) { next(error); }
};

exports.approveAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return ApiResponse.error(res, 'Agent not found', 404);
    if (agent.isActive) return ApiResponse.error(res, 'Already active', 400);
    agent.isActive = true;
    agent.isVerified = true;
    await agent.save({ validateBeforeSave: false });

    // Audit log
    AuditService.log({
      action: 'AGENT_APPROVED', performedBy: req.agent._id, performedByRole: req.agent.role,
      targetModel: 'Agent', targetId: agent._id,
      metadata: AuditService.getMetadata(req),
      description: `Approved agent ${agent.email}`
    });

    // Notification to approved agent
    NotificationService.onAgentApproved(agent);

    // Invalidate cache
    CacheService.invalidate('agent');

    ApiResponse.success(res, { agent }, `Agent ${agent.email} approved`);
  } catch (error) { next(error); }
};

exports.rejectAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return ApiResponse.error(res, 'Agent not found', 404);
    agent.isActive = false;
    agent.isVerified = false;
    await agent.save({ validateBeforeSave: false });

    // Audit log
    AuditService.log({
      action: 'AGENT_REJECTED', performedBy: req.agent._id, performedByRole: req.agent.role,
      targetModel: 'Agent', targetId: agent._id,
      metadata: AuditService.getMetadata(req),
      description: `Rejected agent ${agent.email}. Reason: ${req.body.reason || 'N/A'}`,
      severity: 'warning'
    });

    // Notification to rejected agent
    NotificationService.onAgentRejected(agent);

    ApiResponse.success(res, null, 'Registration rejected');
  } catch (error) { next(error); }
};

exports.updateAgentRole = async (req, res, next) => {
  try {
    const { role: newRole } = req.body;
    const target = await Agent.findById(req.params.id);
    if (!target) return ApiResponse.error(res, 'Agent not found', 404);
    if (req.params.id === req.agent._id.toString()) return ApiResponse.error(res, 'Cannot change own role', 403);

    // Senior agents can only manage members of their own team.
    if (req.agent.role === 'senior_agent' && target.teamLead?.toString() !== req.agent._id.toString()) {
      return ApiResponse.error(res, 'Senior agents can only change roles within their own team', 403);
    }

    if (getRoleLevel(target.role) >= getRoleLevel(req.agent.role))
      return ApiResponse.error(res, `Cannot modify '${target.role}' - same or higher level`, 403);
    if (getRoleLevel(newRole) >= getRoleLevel(req.agent.role))
      return ApiResponse.error(res, `Cannot promote to '${newRole}' - same or higher than yours`, 403);
    if (!canPromoteToRole(req.agent.role, newRole))
      return ApiResponse.error(res, `Not allowed to assign '${newRole}'`, 403);

    const oldRole = target.role;
    target.role = newRole;
    await target.save({ validateBeforeSave: false });

    // Audit log (critical)
    AuditService.logCritical(req, 'AGENT_ROLE_CHANGED', 'Agent', target._id,
      `Changed ${target.email} role from ${oldRole} to ${newRole}`,
      { before: { role: oldRole }, after: { role: newRole } }
    );

    // Notification to the agent whose role changed
    NotificationService.onRoleChanged(target, oldRole, newRole);

    // Invalidate cache
    CacheService.invalidate('agent');

    ApiResponse.success(res, { agent: target }, `Role changed: ${oldRole} → ${newRole}`);
  } catch (error) { next(error); }
};

exports.getAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllAgents') && req.agent._id.toString() !== req.params.id)
      return ApiResponse.error(res, 'Not authorized', 403);
    ApiResponse.success(res, { agent });
  } catch (error) { next(error); }
};

exports.updateAgent = async (req, res, next) => {
  try {
    const { password, role, totalEarnings, totalBookings, refreshToken, isActive, isVerified, ...safeData } = req.body;
    if (req.agent._id.toString() !== req.params.id && !hasPermission(req.agent.role, 'canViewAllAgents'))
      return ApiResponse.error(res, 'Not authorized', 403);
    const agent = await Agent.findByIdAndUpdate(req.params.id, safeData, { new: true, runValidators: true });
    if (!agent) return ApiResponse.error(res, 'Not found', 404);

    // Audit log
    AuditService.logUpdate(req, 'Agent', agent._id, null, safeData, `Updated profile for ${agent.email}`);

    ApiResponse.success(res, { agent }, 'Profile updated');
  } catch (error) { next(error); }
};

exports.deactivateAgent = async (req, res, next) => {
  try {
    const target = await Agent.findById(req.params.id);
    if (!target) return ApiResponse.error(res, 'Not found', 404);
    if (getRoleLevel(target.role) >= getRoleLevel(req.agent.role))
      return ApiResponse.error(res, 'Cannot deactivate same/higher level', 403);
    target.isActive = false;
    await target.save({ validateBeforeSave: false });

    // Audit log
    AuditService.log({
      action: 'AGENT_DEACTIVATED', performedBy: req.agent._id, performedByRole: req.agent.role,
      targetModel: 'Agent', targetId: target._id,
      metadata: AuditService.getMetadata(req),
      description: `Deactivated agent ${target.email}`,
      severity: 'warning'
    });

    // Invalidate cache
    CacheService.invalidate('agent');

    ApiResponse.success(res, { agent: target }, 'Deactivated');
  } catch (error) { next(error); }
};

exports.activateAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return ApiResponse.error(res, 'Not found', 404);
    if (getRoleLevel(agent.role) >= getRoleLevel(req.agent.role))
      return ApiResponse.error(res, 'Cannot activate same/higher level agent', 403);
    agent.isActive = true;
    await agent.save({ validateBeforeSave: false });

    // Audit log
    AuditService.log({
      action: 'AGENT_ACTIVATED', performedBy: req.agent._id, performedByRole: req.agent.role,
      targetModel: 'Agent', targetId: agent._id,
      metadata: AuditService.getMetadata(req),
      description: `Activated agent ${agent.email}`
    });

    // Invalidate cache
    CacheService.invalidate('agent');

    ApiResponse.success(res, { agent }, 'Activated');
  } catch (error) { next(error); }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const Customer = require('../models/Customer');
    const Lead = require('../models/Lead');
    const Commission = require('../models/Commission');

    const canViewAll = hasPermission(req.agent.role, 'canViewAllBookings');
    const filter = canViewAll ? {} : { agent: req.agent._id };

    const [totalCustomers, totalBookings, totalLeads, revenueStats, commissionStats, recentBookings, upcomingFollowUps] = await Promise.all([
      Customer.countDocuments(filter),
      Booking.countDocuments(filter),
      Lead.countDocuments(filter),
      Booking.aggregate([{ $match: { ...filter, status: { $in: ['confirmed', 'completed'] } } }, { $group: { _id: null, totalRevenue: { $sum: '$pricing.totalAmount' }, avgBookingValue: { $avg: '$pricing.totalAmount' } } }]),
      Commission.aggregate([{ $match: filter }, { $group: { _id: null, totalCommission: { $sum: '$totalEarning' }, pendingCommission: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$totalEarning', 0] } }, paidCommission: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalEarning', 0] } } } }]),
      Booking.find(filter).sort('-createdAt').limit(5).populate('customer', 'firstName lastName').select('bookingReference tripDetails.title tripDetails.destination status pricing.totalAmount createdAt'),
      Lead.find({ ...filter, nextFollowUpDate: { $lte: new Date(Date.now() + 86400000) }, status: { $nin: ['converted', 'lost'] } }).sort('nextFollowUpDate').limit(5).select('leadReference contactInfo.firstName contactInfo.lastName nextFollowUpDate status priority')
    ]);

    ApiResponse.success(res, {
      totalCustomers, totalBookings, totalLeads,
      revenue: revenueStats[0] || { totalRevenue: 0, avgBookingValue: 0 },
      commissions: commissionStats[0] || { totalCommission: 0, pendingCommission: 0, paidCommission: 0 },
      recentBookings, upcomingFollowUps
    });
  } catch (error) { next(error); }
};

// --- Team Management ---

exports.getTeamMembers = async (req, res, next) => {
  try {
    const members = await Agent.find({ teamLead: req.agent._id, isActive: true })
      .select('firstName lastName email role commissionRate totalBookings totalEarnings isActive')
      .sort('firstName');
    ApiResponse.success(res, { members, count: members.length }, 'Team members');
  } catch (error) { next(error); }
};

exports.assignToTeam = async (req, res, next) => {
  try {
    const target = await Agent.findById(req.params.id);
    if (!target) return ApiResponse.error(res, 'Agent not found', 404);
    if (getRoleLevel(target.role) >= getRoleLevel(req.agent.role))
      return ApiResponse.error(res, 'Cannot assign same or higher level agent to your team', 403);
    if (target._id.toString() === req.agent._id.toString())
      return ApiResponse.error(res, 'Cannot assign yourself to your own team', 400);

    target.teamLead = req.agent._id;
    await target.save({ validateBeforeSave: false });

    AuditService.log({
      action: 'AGENT_ASSIGNED_TO_TEAM', performedBy: req.agent._id, performedByRole: req.agent.role,
      targetModel: 'Agent', targetId: target._id,
      metadata: AuditService.getMetadata(req),
      description: `Assigned ${target.email} to team of ${req.agent.email}`
    });

    ApiResponse.success(res, { agent: target }, `${target.fullName} assigned to your team`);
  } catch (error) { next(error); }
};

exports.removeFromTeam = async (req, res, next) => {
  try {
    const target = await Agent.findById(req.params.id);
    if (!target) return ApiResponse.error(res, 'Agent not found', 404);
    if (!target.teamLead || target.teamLead.toString() !== req.agent._id.toString()) {
      if (!hasPermission(req.agent.role, 'canViewAllAgents')) {
        return ApiResponse.error(res, 'This agent is not in your team', 403);
      }
    }

    target.teamLead = null;
    await target.save({ validateBeforeSave: false });

    AuditService.log({
      action: 'AGENT_REMOVED_FROM_TEAM', performedBy: req.agent._id, performedByRole: req.agent.role,
      targetModel: 'Agent', targetId: target._id,
      metadata: AuditService.getMetadata(req),
      description: `Removed ${target.email} from team`
    });

    ApiResponse.success(res, { agent: target }, `${target.fullName} removed from team`);
  } catch (error) { next(error); }
};
