// controllers/auditController.js
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/apiResponse');
const { buildPagination } = require('../utils/helpers');

// @desc    Get audit logs (paginated, filterable)
// @route   GET /api/audit-logs
// @access  Admin+
exports.getAuditLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filter = {};

        // Filter by action
        if (req.query.action) filter.action = req.query.action;

        // Filter by performedBy (agent ID)
        if (req.query.performedBy) filter.performedBy = req.query.performedBy;

        // Filter by resource type
        if (req.query.resourceType) filter.targetModel = req.query.resourceType;

        // Filter by target ID
        if (req.query.targetId) filter.targetId = req.query.targetId;

        // Filter by severity
        if (req.query.severity) filter.severity = req.query.severity;

        // Date range
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
            if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
        }

        const total = await AuditLog.countDocuments(filter);
        const { pagination, startIndex } = buildPagination(page, limit, total);

        const logs = await AuditLog.find(filter)
            .populate('performedBy', 'firstName lastName email role')
            .sort(req.query.sort || '-createdAt')
            .skip(startIndex)
            .limit(limit);

        ApiResponse.paginated(res, logs, pagination);
    } catch (error) { next(error); }
};

// @desc    Get audit log by ID
// @route   GET /api/audit-logs/:id
// @access  Admin+
exports.getAuditLog = async (req, res, next) => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate('performedBy', 'firstName lastName email role');
        if (!log) return ApiResponse.error(res, 'Audit log not found', 404);
        ApiResponse.success(res, { auditLog: log });
    } catch (error) { next(error); }
};

// @desc    Get audit log statistics
// @route   GET /api/audit-logs/stats
// @access  Admin+
exports.getAuditStats = async (req, res, next) => {
    try {
        const [actionStats, resourceStats, userStats, severityStats, recentActivity] = await Promise.all([
            // Top actions
            AuditLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 15 }
            ]),
            // By resource type
            AuditLog.aggregate([
                { $group: { _id: '$targetModel', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // Most active users
            AuditLog.aggregate([
                { $group: { _id: '$performedBy', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $lookup: { from: 'agents', localField: '_id', foreignField: '_id', as: 'agent' } },
                { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
                { $project: { count: 1, name: { $concat: [{ $ifNull: ['$agent.firstName', ''] }, ' ', { $ifNull: ['$agent.lastName', ''] }] }, email: '$agent.email' } }
            ]),
            // By severity
            AuditLog.aggregate([
                { $group: { _id: '$severity', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // Recent 24h activity count
            AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        ]);

        ApiResponse.success(res, {
            actionStats,
            resourceStats,
            userStats,
            severityStats,
            recentActivity24h: recentActivity,
            totalLogs: await AuditLog.estimatedDocumentCount()
        });
    } catch (error) { next(error); }
};
