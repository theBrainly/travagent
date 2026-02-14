// services/booking/index.js — Booking Service Facade
const express = require('express');
const router = express.Router();
const { eventBus, EVENTS } = require('../../shared/eventBus');

const SERVICE_NAME = 'BookingService';

/**
 * Booking Service — handles bookings, customers, itineraries, leads
 * Routes: /api/bookings, /api/customers, /api/itineraries, /api/leads
 */

// Mount existing routes
router.use('/bookings', require('../../routes/bookingRoutes'));
router.use('/customers', require('../../routes/customerRoutes'));
router.use('/itineraries', require('../../routes/itineraryRoutes'));
router.use('/leads', require('../../routes/leadRoutes'));

// Event subscriptions — react to payment events
eventBus.subscribe(EVENTS.PAYMENT_COMPLETED, async (data) => {
    console.log(`  [${SERVICE_NAME}] Payment completed for booking ${data.bookingId} — updating status`);
    // In a real microservice, this would update booking status via API call
    try {
        const Booking = require('../../models/Booking');
        await Booking.findByIdAndUpdate(data.bookingId, {
            paymentStatus: 'paid'
        });
    } catch (err) {
        console.error(`  [${SERVICE_NAME}] Failed to update booking payment status: ${err.message}`);
    }
}, SERVICE_NAME);

module.exports = {
    name: SERVICE_NAME,
    router,
    description: 'Booking management, customer profiles, itineraries, and lead tracking',
    routes: ['/api/bookings', '/api/customers', '/api/itineraries', '/api/leads'],
    healthCheck: async () => {
        const Booking = require('../../models/Booking');
        await Booking.countDocuments();
        return true;
    }
};
