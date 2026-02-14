// jobs/cron/commissionCalc.js
const cron = require('node-cron');
const Booking = require('../../models/Booking');
const Commission = require('../../models/Commission');
const CommissionService = require('../../services/commissionService');

/**
 * Commission Calculation — runs every hour
 * Finds completed bookings without a Commission record and creates one
 */
const startCommissionCalc = () => {
    const task = cron.schedule('0 * * * *', async () => {
        console.log('  ⏰ [Cron] Running commission calculation...');

        try {
            // Find completed bookings
            const completedBookings = await Booking.find({
                status: { $in: ['confirmed', 'completed'] }
            }).select('_id agent pricing');

            let created = 0;
            let skipped = 0;

            for (const booking of completedBookings) {
                // Check if commission already exists for this booking
                const existing = await Commission.findOne({ booking: booking._id });
                if (existing) {
                    skipped++;
                    continue;
                }

                try {
                    await CommissionService.createCommission(booking, booking.agent);
                    created++;
                } catch (err) {
                    // Skip individual failures (agent not found, etc.)
                    console.error(`  ⚠️  [Cron] Commission creation failed for booking ${booking._id}: ${err.message}`);
                }
            }

            console.log(`  ✅ [Cron] Commission calc done — Created: ${created}, Skipped: ${skipped}`);
        } catch (err) {
            console.error(`  ❌ [Cron] Commission calculation error: ${err.message}`);
        }
    }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
    });

    return task;
};

module.exports = startCommissionCalc;
