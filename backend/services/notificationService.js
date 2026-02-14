// services/notificationService.js
const Notification = require('../models/Notification');
const EmailService = require('./emailService');
const Agent = require('../models/Agent');

class NotificationService {
    /**
     * Create an in-app notification and optionally send email
     * @param {Object} data
     * @param {string} data.recipientId - Agent ID to notify
     * @param {string} data.type - Notification type enum
     * @param {string} data.title - Short notification title
     * @param {string} data.message - Notification body
     * @param {string} data.resourceType - 'booking', 'lead', etc.
     * @param {ObjectId} data.resourceId - Related resource ID
     * @param {string} data.priority - 'low', 'medium', 'high'
     * @param {boolean} data.sendEmail - Whether to also send email simulation
     */
    static async send(data) {
        try {
            const notification = await Notification.create({
                recipient: data.recipientId,
                type: data.type,
                title: data.title,
                message: data.message,
                resourceType: data.resourceType || null,
                resourceId: data.resourceId || null,
                priority: data.priority || 'medium',
                emailSent: false
            });

            // Send email simulation if requested
            if (data.sendEmail !== false) {
                try {
                    const agent = await Agent.findById(data.recipientId).select('email firstName lastName');
                    if (agent?.email) {
                        await EmailService.sendEmail({
                            to: agent.email,
                            subject: data.title,
                            text: data.message
                        });
                        notification.emailSent = true;
                        await notification.save();
                    }
                } catch (emailErr) {
                    console.error('Email send failed (notification still created):', emailErr.message);
                }
            }

            return notification;
        } catch (err) {
            console.error('Notification creation error:', err.message);
            return null;
        }
    }

    /**
     * Send notification to multiple recipients
     */
    static async sendToMany(recipientIds, data) {
        const promises = recipientIds.map(id =>
            NotificationService.send({ ...data, recipientId: id })
        );
        return Promise.allSettled(promises);
    }

    /**
     * Notify all admins (admin + super_admin)
     */
    static async notifyAdmins(data) {
        try {
            const admins = await Agent.find({
                role: { $in: ['admin', 'super_admin'] },
                isActive: true
            }).select('_id');

            const adminIds = admins.map(a => a._id);
            return NotificationService.sendToMany(adminIds, data);
        } catch (err) {
            console.error('Notify admins error:', err.message);
            return [];
        }
    }

    /**
     * Get notifications for a user (paginated)
     */
    static async getNotifications(agentId, query = {}) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { recipient: agentId };
        if (query.isRead !== undefined) filter.isRead = query.isRead === 'true';
        if (query.type) filter.type = query.type;

        const [notifications, total] = await Promise.all([
            Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
            Notification.countDocuments(filter)
        ]);

        return {
            notifications,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                limit
            }
        };
    }

    /**
     * Get unread notification count for a user
     */
    static async getUnreadCount(agentId) {
        return Notification.countDocuments({ recipient: agentId, isRead: false });
    }

    /**
     * Mark a single notification as read
     */
    static async markAsRead(notificationId, agentId) {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: agentId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );
        return notification;
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(agentId) {
        const result = await Notification.updateMany(
            { recipient: agentId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
        return result;
    }

    /**
     * Delete a notification
     */
    static async deleteNotification(notificationId, agentId) {
        const result = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: agentId
        });
        return result;
    }

    // =========================================================
    // Pre-built notification triggers for business events
    // =========================================================

    static async onBookingCreated(booking, agentId) {
        return NotificationService.send({
            recipientId: agentId,
            type: 'BOOKING_CREATED',
            title: 'New Booking Created',
            message: `Booking "${booking.tripDetails?.title}" to ${booking.tripDetails?.destination} created successfully. Reference: ${booking.bookingReference}`,
            resourceType: 'booking',
            resourceId: booking._id,
            priority: 'medium'
        });
    }

    static async onBookingConfirmed(booking, agentId) {
        // Notify the agent
        await NotificationService.send({
            recipientId: agentId,
            type: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed',
            message: `Booking "${booking.tripDetails?.title}" (${booking.bookingReference}) has been confirmed.`,
            resourceType: 'booking',
            resourceId: booking._id,
            priority: 'high',
            sendEmail: true
        });
    }

    static async onBookingCancelled(booking, agentId) {
        await NotificationService.send({
            recipientId: agentId,
            type: 'BOOKING_CANCELLED',
            title: 'Booking Cancelled',
            message: `Booking "${booking.tripDetails?.title}" (${booking.bookingReference}) has been cancelled.`,
            resourceType: 'booking',
            resourceId: booking._id,
            priority: 'high'
        });

        // Notify admins
        await NotificationService.notifyAdmins({
            type: 'BOOKING_CANCELLED',
            title: 'Booking Cancelled',
            message: `Booking ${booking.bookingReference} has been cancelled by an agent.`,
            resourceType: 'booking',
            resourceId: booking._id,
            priority: 'medium',
            sendEmail: false
        });
    }

    static async onPaymentReceived(payment, agentId) {
        await NotificationService.send({
            recipientId: agentId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received',
            message: `Payment of ₹${payment.amount?.toLocaleString()} received via ${payment.paymentMethod}. Transaction: ${payment.transactionId}`,
            resourceType: 'payment',
            resourceId: payment._id,
            priority: 'high',
            sendEmail: true
        });

        // Notify admins
        await NotificationService.notifyAdmins({
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received',
            message: `Payment of ₹${payment.amount?.toLocaleString()} (${payment.transactionId}) processed.`,
            resourceType: 'payment',
            resourceId: payment._id,
            priority: 'medium',
            sendEmail: false
        });
    }

    static async onPaymentRefunded(payment, agentId) {
        return NotificationService.send({
            recipientId: agentId,
            type: 'PAYMENT_REFUNDED',
            title: 'Refund Processed',
            message: `Refund of ₹${payment.refundDetails?.refundAmount?.toLocaleString()} processed for transaction ${payment.transactionId}.`,
            resourceType: 'payment',
            resourceId: payment._id,
            priority: 'high',
            sendEmail: true
        });
    }

    static async onLeadAssigned(lead, assignedAgentId) {
        return NotificationService.send({
            recipientId: assignedAgentId,
            type: 'LEAD_ASSIGNED',
            title: 'New Lead Assigned',
            message: `Lead "${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}" has been assigned to you. Source: ${lead.source}`,
            resourceType: 'lead',
            resourceId: lead._id,
            priority: 'high',
            sendEmail: true
        });
    }

    static async onLeadStatusChanged(lead, agentId) {
        return NotificationService.send({
            recipientId: agentId,
            type: 'LEAD_STATUS_CHANGED',
            title: 'Lead Status Updated',
            message: `Lead "${lead.contactInfo?.firstName} ${lead.contactInfo?.lastName}" status changed to "${lead.status}".`,
            resourceType: 'lead',
            resourceId: lead._id,
            priority: 'low',
            sendEmail: false
        });
    }

    static async onAgentApproved(agent) {
        return NotificationService.send({
            recipientId: agent._id,
            type: 'AGENT_APPROVED',
            title: 'Account Approved!',
            message: `Welcome! Your agent account has been approved. You can now access all features.`,
            resourceType: 'agent',
            resourceId: agent._id,
            priority: 'high',
            sendEmail: true
        });
    }

    static async onAgentRejected(agent) {
        return NotificationService.send({
            recipientId: agent._id,
            type: 'AGENT_REJECTED',
            title: 'Account Registration Rejected',
            message: `Your agent account registration has been rejected. Please contact admin for details.`,
            resourceType: 'agent',
            resourceId: agent._id,
            priority: 'high',
            sendEmail: true
        });
    }

    static async onRoleChanged(agent, oldRole, newRole) {
        return NotificationService.send({
            recipientId: agent._id,
            type: 'ROLE_CHANGED',
            title: `Role Updated: ${oldRole} → ${newRole}`,
            message: `Your role has been changed from "${oldRole}" to "${newRole}". Your permissions have been updated accordingly.`,
            resourceType: 'agent',
            resourceId: agent._id,
            priority: 'medium',
            sendEmail: true
        });
    }

    static async onCommissionApproved(commission, agentId) {
        return NotificationService.send({
            recipientId: agentId,
            type: 'COMMISSION_APPROVED',
            title: 'Commission Approved',
            message: `Your commission of ₹${commission.totalEarning?.toLocaleString()} has been approved.`,
            resourceType: 'commission',
            resourceId: commission._id,
            priority: 'medium',
            sendEmail: true
        });
    }

    static async onCommissionPaid(commission, agentId) {
        return NotificationService.send({
            recipientId: agentId,
            type: 'COMMISSION_PAID',
            title: 'Commission Paid',
            message: `Your commission of ₹${commission.totalEarning?.toLocaleString()} has been paid out.`,
            resourceType: 'commission',
            resourceId: commission._id,
            priority: 'high',
            sendEmail: true
        });
    }
}

module.exports = NotificationService;
