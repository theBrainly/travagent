// models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true, index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    performedByRole: { type: String, required: true },
    targetModel: {
        type: String,
        required: true,
        enum: ['Agent', 'Booking', 'Payment', 'Lead', 'Customer', 'Commission', 'Itinerary', 'Auth', 'System'],
        index: true
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    metadata: {
        ip: String,
        userAgent: String
    },
    description: String,
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info',
        index: true
    }
}, { timestamps: true });

// Compound indexes for efficient querying
auditLogSchema.index({ targetModel: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);