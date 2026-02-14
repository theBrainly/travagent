// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'LEAD_ASSIGNED', 'LEAD_STATUS_CHANGED',
            'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_CREATED',
            'PAYMENT_RECEIVED', 'PAYMENT_REFUNDED',
            'AGENT_APPROVED', 'AGENT_REJECTED', 'ROLE_CHANGED',
            'COMMISSION_APPROVED', 'COMMISSION_PAID',
            'BOOKING_REMINDER', 'SYSTEM'
        ],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    resourceType: {
        type: String,
        enum: ['booking', 'payment', 'lead', 'agent', 'customer', 'commission', 'itinerary', 'system']
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    emailSent: { type: Boolean, default: false }
}, { timestamps: true });

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
