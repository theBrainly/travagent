// services/payment/index.js — Payment Service Facade
const express = require('express');
const router = express.Router();
const { eventBus, EVENTS } = require('../../shared/eventBus');

const SERVICE_NAME = 'PaymentService';

/**
 * Payment Service — handles payments and commissions
 * Routes: /api/payments, /api/commissions
 */

// Mount existing routes
router.use('/payments', require('../../routes/paymentRoutes'));
router.use('/commissions', require('../../routes/commissionRoutes'));

// Event subscriptions — create commission on booking confirmation
eventBus.subscribe(EVENTS.BOOKING_CONFIRMED, async (data) => {
    console.log(`  [${SERVICE_NAME}] Booking confirmed: ${data.bookingId} — checking commission`);
    try {
        const Commission = require('../../models/Commission');
        const existing = await Commission.findOne({ booking: data.bookingId });
        if (!existing && data.agentId) {
            const CommissionService = require('../commissionService');
            const Booking = require('../../models/Booking');
            const booking = await Booking.findById(data.bookingId);
            if (booking) {
                await CommissionService.createCommission(booking, data.agentId);
                console.log(`  [${SERVICE_NAME}] Commission created for booking ${data.bookingId}`);
            }
        }
    } catch (err) {
        console.error(`  [${SERVICE_NAME}] Commission creation error: ${err.message}`);
    }
}, SERVICE_NAME);

module.exports = {
    name: SERVICE_NAME,
    router,
    description: 'Payment processing, refunds, and commission management',
    routes: ['/api/payments', '/api/commissions'],
    healthCheck: async () => {
        const Payment = require('../../models/Payment');
        await Payment.countDocuments();
        return true;
    }
};
