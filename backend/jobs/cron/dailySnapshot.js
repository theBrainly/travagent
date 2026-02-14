// jobs/cron/dailySnapshot.js
const cron = require('node-cron');
const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const Lead = require('../../models/Lead');
const Customer = require('../../models/Customer');
const Payment = require('../../models/Payment');

// Define a simple schema for daily snapshots
const snapshotSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    stats: {
        totalBookings: Number,
        confirmedBookings: Number,
        completedBookings: Number,
        cancelledBookings: Number,
        totalRevenue: Number,
        totalLeads: Number,
        newLeads: Number,
        convertedLeads: Number,
        lostLeads: Number,
        totalCustomers: Number,
        totalPayments: Number,
        completedPayments: Number,
        totalPaymentAmount: Number
    }
}, { timestamps: true });

const DailySnapshot = mongoose.models.DailySnapshot || mongoose.model('DailySnapshot', snapshotSchema);

/**
 * Daily Stats Snapshot — runs daily at 11 PM
 * Saves aggregate stats for historical trending
 */
const startDailySnapshot = () => {
    const task = cron.schedule('0 23 * * *', async () => {
        console.log('  ⏰ [Cron] Running daily stats snapshot...');

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if snapshot already exists for today
            const existing = await DailySnapshot.findOne({ date: today });
            if (existing) {
                console.log('  ℹ️  [Cron] Snapshot already exists for today — skipping');
                return;
            }

            // Aggregate stats
            const [
                totalBookings,
                confirmedBookings,
                completedBookings,
                cancelledBookings,
                totalLeads,
                newLeads,
                convertedLeads,
                lostLeads,
                totalCustomers,
                totalPayments,
                completedPayments,
                revenueAgg
            ] = await Promise.all([
                Booking.countDocuments(),
                Booking.countDocuments({ status: 'confirmed' }),
                Booking.countDocuments({ status: 'completed' }),
                Booking.countDocuments({ status: 'cancelled' }),
                Lead.countDocuments(),
                Lead.countDocuments({ status: 'new' }),
                Lead.countDocuments({ status: 'converted' }),
                Lead.countDocuments({ status: 'lost' }),
                Customer.countDocuments(),
                Payment.countDocuments(),
                Payment.countDocuments({ status: 'completed' }),
                Payment.aggregate([
                    { $match: { status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ])
            ]);

            const totalPaymentAmount = revenueAgg[0]?.total || 0;

            const revenueBookingAgg = await Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] } } },
                { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
            ]);
            const totalRevenue = revenueBookingAgg[0]?.total || 0;

            await DailySnapshot.create({
                date: today,
                stats: {
                    totalBookings, confirmedBookings, completedBookings, cancelledBookings,
                    totalRevenue, totalLeads, newLeads, convertedLeads, lostLeads,
                    totalCustomers, totalPayments, completedPayments, totalPaymentAmount
                }
            });

            console.log(`  ✅ [Cron] Daily snapshot saved — Bookings: ${totalBookings}, Revenue: ₹${totalRevenue.toLocaleString()}, Leads: ${totalLeads}`);
        } catch (err) {
            console.error(`  ❌ [Cron] Daily snapshot error: ${err.message}`);
        }
    }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
    });

    return task;
};

module.exports = { startDailySnapshot, DailySnapshot };
