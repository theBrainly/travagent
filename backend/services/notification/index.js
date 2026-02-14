// services/notification/index.js — Notification Service Facade
const express = require('express');
const router = express.Router();
const { eventBus, EVENTS } = require('../../shared/eventBus');
const NotificationService = require('../notificationService');

const SERVICE_NAME = 'NotificationMicroService';

/**
 * Notification Service — handles notifications, email sending
 * Routes: /api/notifications
 */

// Mount existing routes
router.use('/notifications', require('../../routes/notificationRoutes'));

// Event subscriptions — send notifications for key events
eventBus.subscribe(EVENTS.BOOKING_CREATED, async (data) => {
    console.log(`  [${SERVICE_NAME}] Sending notification for new booking: ${data.bookingId}`);
    try {
        if (data.agentId) {
            await NotificationService.send({
                recipientId: data.agentId,
                type: 'BOOKING_CREATED',
                title: `New Booking Created`,
                message: `Booking ${data.bookingReference || data.bookingId} has been created`,
                resourceType: 'booking',
                resourceId: data.bookingId,
                priority: 'medium'
            });
        }
    } catch (err) {
        console.error(`  [${SERVICE_NAME}] Notification error: ${err.message}`);
    }
}, SERVICE_NAME);

eventBus.subscribe(EVENTS.PAYMENT_COMPLETED, async (data) => {
    console.log(`  [${SERVICE_NAME}] Sending notification for payment: ${data.paymentId}`);
    try {
        if (data.agentId) {
            await NotificationService.send({
                recipientId: data.agentId,
                type: 'PAYMENT_RECEIVED',
                title: `Payment Received`,
                message: `Payment of ₹${data.amount} received for booking ${data.bookingId}`,
                resourceType: 'payment',
                resourceId: data.paymentId,
                priority: 'high'
            });
        }
    } catch (err) {
        console.error(`  [${SERVICE_NAME}] Notification error: ${err.message}`);
    }
}, SERVICE_NAME);

module.exports = {
    name: SERVICE_NAME,
    router,
    description: 'In-app notifications, email dispatch, and alert management',
    routes: ['/api/notifications'],
    healthCheck: async () => {
        const Notification = require('../../models/Notification');
        await Notification.countDocuments();
        return true;
    }
};
