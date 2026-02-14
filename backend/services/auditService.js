// services/auditService.js
const AuditLog = require('../models/AuditLog');

class AuditService {
    /**
     * Create an audit log entry
     * @param {Object} data
     * @param {string} data.action - Action name (e.g., 'BOOKING_CREATED')
     * @param {ObjectId} data.performedBy - Agent who performed the action
     * @param {string} data.performedByRole - Role of the agent
     * @param {string} data.targetModel - Model name ('Booking', 'Lead', etc.)
     * @param {ObjectId} data.targetId - ID of the affected resource
     * @param {Object} data.changes - { before, after } for updates
     * @param {Object} data.metadata - { ip, userAgent }
     * @param {string} data.description - Human-readable description
     * @param {string} data.severity - 'info', 'warning', or 'critical'
     */
    static async log(data) {
        try {
            await AuditLog.create({
                action: data.action,
                performedBy: data.performedBy,
                performedByRole: data.performedByRole,
                targetModel: data.targetModel,
                targetId: data.targetId || null,
                changes: data.changes || {},
                metadata: data.metadata || {},
                description: data.description || '',
                severity: data.severity || 'info'
            });
        } catch (err) {
            console.error('Audit log error:', err.message);
        }
    }

    /**
     * Extract IP and UserAgent from Express request
     */
    static getMetadata(req) {
        return {
            ip: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.headers?.['user-agent'] || 'unknown'
        };
    }

    /**
     * Helper: Log a create action
     */
    static async logCreate(req, targetModel, targetId, description) {
        return AuditService.log({
            action: `${targetModel.toUpperCase()}_CREATED`,
            performedBy: req.agent._id,
            performedByRole: req.agent.role,
            targetModel,
            targetId,
            metadata: AuditService.getMetadata(req),
            description,
            severity: 'info'
        });
    }

    /**
     * Helper: Log an update action with before/after
     */
    static async logUpdate(req, targetModel, targetId, before, after, description) {
        return AuditService.log({
            action: `${targetModel.toUpperCase()}_UPDATED`,
            performedBy: req.agent._id,
            performedByRole: req.agent.role,
            targetModel,
            targetId,
            changes: { before, after },
            metadata: AuditService.getMetadata(req),
            description,
            severity: 'info'
        });
    }

    /**
     * Helper: Log a delete action
     */
    static async logDelete(req, targetModel, targetId, description) {
        return AuditService.log({
            action: `${targetModel.toUpperCase()}_DELETED`,
            performedBy: req.agent._id,
            performedByRole: req.agent.role,
            targetModel,
            targetId,
            metadata: AuditService.getMetadata(req),
            description,
            severity: 'warning'
        });
    }

    /**
     * Helper: Log a status change
     */
    static async logStatusChange(req, targetModel, targetId, oldStatus, newStatus, description) {
        return AuditService.log({
            action: `${targetModel.toUpperCase()}_STATUS_CHANGED`,
            performedBy: req.agent._id,
            performedByRole: req.agent.role,
            targetModel,
            targetId,
            changes: { before: { status: oldStatus }, after: { status: newStatus } },
            metadata: AuditService.getMetadata(req),
            description,
            severity: newStatus === 'cancelled' || newStatus === 'refunded' ? 'warning' : 'info'
        });
    }

    /**
     * Helper: Log a critical action
     */
    static async logCritical(req, action, targetModel, targetId, description, changes = {}) {
        return AuditService.log({
            action,
            performedBy: req.agent._id,
            performedByRole: req.agent.role,
            targetModel,
            targetId,
            changes,
            metadata: AuditService.getMetadata(req),
            description,
            severity: 'critical'
        });
    }
}

module.exports = AuditService;