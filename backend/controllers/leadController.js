// controllers/leadController.js
const LeadService = require('../services/leadService');
const ApiResponse = require('../utils/apiResponse');
const { hasPermission } = require('../config/role');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const { CacheService } = require('../services/cacheService');

exports.createLead = async (req, res, next) => {
  try {
    const lead = await LeadService.createLead(req.body, req.agent._id);

    // Audit log
    AuditService.logCreate(req, 'Lead', lead._id, `Created lead: ${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}`);

    // Invalidate cache
    CacheService.invalidate('lead');

    ApiResponse.created(res, { lead });
  } catch (error) { next(error); }
};

exports.getLeads = async (req, res, next) => {
  try {
    const { leads, pagination } = await LeadService.getLeads(req.agent._id, req.agent.role, req.query);
    ApiResponse.paginated(res, leads, pagination);
  } catch (error) { next(error); }
};

exports.getLead = async (req, res, next) => {
  try {
    const lead = await LeadService.getLeadById(req.params.id);
    if (!hasPermission(req.agent.role, 'canViewAllLeads') && lead.agent._id.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized to view this lead', 403);
    ApiResponse.success(res, { lead });
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.updateLead = async (req, res, next) => {
  try {
    // Get old lead for audit comparison
    const Lead = require('../models/Lead');
    const oldLead = await Lead.findById(req.params.id).select('status contactInfo');
    const oldStatus = oldLead?.status;

    const lead = await LeadService.updateLead(req.params.id, req.body, req.agent._id, req.agent.role);

    // Audit log
    if (req.body.status && req.body.status !== oldStatus) {
      AuditService.logStatusChange(req, 'Lead', lead._id, oldStatus, req.body.status,
        `Lead "${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}" status: ${oldStatus} → ${req.body.status}`);
      // Notification for status change
      NotificationService.onLeadStatusChanged(lead, req.agent._id);
    } else {
      AuditService.logUpdate(req, 'Lead', lead._id, null, req.body,
        `Updated lead "${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}"`);
    }

    // Invalidate cache
    CacheService.invalidate('lead');

    ApiResponse.success(res, { lead }, 'Updated');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.addFollowUp = async (req, res, next) => {
  try {
    const lead = await LeadService.addFollowUp(req.params.id, req.body, req.agent._id, req.agent.role);

    AuditService.log({
      action: 'LEAD_FOLLOWUP_ADDED',
      performedBy: req.agent._id,
      performedByRole: req.agent.role,
      targetModel: 'Lead',
      targetId: lead._id,
      metadata: AuditService.getMetadata(req),
      description: `Follow-up added to lead "${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}"`
    });

    ApiResponse.success(res, { lead }, 'Follow-up added');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.convertLead = async (req, res, next) => {
  try {
    const result = await LeadService.convertLeadToBooking(req.params.id, req.body, req.agent._id);

    // Audit log (important action)
    AuditService.log({
      action: 'LEAD_CONVERTED',
      performedBy: req.agent._id,
      performedByRole: req.agent.role,
      targetModel: 'Lead',
      targetId: req.params.id,
      metadata: AuditService.getMetadata(req),
      description: `Lead converted to booking`,
      severity: 'info'
    });

    // Invalidate both lead and booking caches
    CacheService.invalidate('lead');
    CacheService.invalidate('booking');

    ApiResponse.success(res, result, 'Lead converted');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.assignLead = async (req, res, next) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return ApiResponse.error(res, 'Agent ID required', 400);
    const lead = await LeadService.assignLead(req.params.id, agentId);

    // Audit log
    AuditService.log({
      action: 'LEAD_ASSIGNED',
      performedBy: req.agent._id,
      performedByRole: req.agent.role,
      targetModel: 'Lead',
      targetId: lead._id,
      changes: { after: { assignedAgent: agentId } },
      metadata: AuditService.getMetadata(req),
      description: `Lead "${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}" assigned to agent ${agentId}`
    });

    // Notification to assigned agent
    NotificationService.onLeadAssigned(lead, agentId);

    // Invalidate cache
    CacheService.invalidate('lead');

    ApiResponse.success(res, { lead }, 'Lead assigned');
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

exports.getLeadStats = async (req, res, next) => {
  try {
    const stats = await LeadService.getLeadStats(req.agent._id, req.agent.role);
    ApiResponse.success(res, stats);
  } catch (error) { next(error); }
};

exports.deleteLead = async (req, res, next) => {
  try {
    const Lead = require('../models/Lead');
    const lead = await Lead.findById(req.params.id);
    if (!lead) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllLeads') && lead.agent.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);
    await Lead.findByIdAndDelete(req.params.id);

    // Audit log
    AuditService.logDelete(req, 'Lead', req.params.id, `Deleted lead "${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}"`);

    // Invalidate cache
    CacheService.invalidate('lead');

    ApiResponse.success(res, null, 'Deleted');
  } catch (error) { next(error); }
};