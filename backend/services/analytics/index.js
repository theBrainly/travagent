// services/analytics/index.js — Analytics Service Facade
const express = require('express');
const router = express.Router();
const { eventBus, EVENTS } = require('../../shared/eventBus');

const SERVICE_NAME = 'AnalyticsService';

/**
 * Analytics Service — handles dashboard, analytics, audit logs
 * Routes: /api/dashboard, /api/dashboard/analytics, /api/audit-logs
 */

// Mount existing routes
router.use('/dashboard', require('../../routes/dashboardRoutes'));
router.use('/dashboard/analytics', require('../../routes/analyticsRoutes'));
router.use('/audit-logs', require('../../routes/auditRoutes'));

// Event subscriptions — track events for analytics
eventBus.subscribe(EVENTS.BOOKING_CREATED, async (data) => {
    console.log(`  [${SERVICE_NAME}] Tracking booking creation for analytics: ${data.bookingId}`);
    // In production, this would update analytics counters, dashboards, etc.
}, SERVICE_NAME);

eventBus.subscribe(EVENTS.PAYMENT_COMPLETED, async (data) => {
    console.log(`  [${SERVICE_NAME}] Tracking payment for analytics: ${data.paymentId}`);
}, SERVICE_NAME);

module.exports = {
    name: SERVICE_NAME,
    router,
    description: 'Dashboard metrics, analytics reports, and audit log management',
    routes: ['/api/dashboard', '/api/dashboard/analytics', '/api/audit-logs'],
    healthCheck: async () => {
        const AuditLog = require('../../models/AuditLog');
        await AuditLog.countDocuments();
        return true;
    }
};
