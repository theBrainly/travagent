// jobs/cron/bookingReminder.js
const cron = require('node-cron');
const Booking = require('../../models/Booking');
const NotificationService = require('../../services/notificationService');

/**
 * Booking Reminder — runs daily at 9 AM
 * Finds bookings starting in 7 days and sends notifications to agents
 */
const startBookingReminder = () => {
    const task = cron.schedule('0 9 * * *', async () => {
        console.log('  ⏰ [Cron] Running booking reminder job...');

        try {
            const today = new Date();
            const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const upcomingBookings = await Booking.find({
                'tripDetails.startDate': { $gte: today, $lte: sevenDaysFromNow },
                status: { $in: ['confirmed', 'in_progress'] }
            }).populate('agent', '_id firstName lastName email')
                .populate('customer', 'firstName lastName');

            if (upcomingBookings.length === 0) {
                console.log('  ℹ️  [Cron] No upcoming bookings in 7 days');
                return;
            }

            let sentCount = 0;
            for (const booking of upcomingBookings) {
                if (!booking.agent?._id) continue;

                await NotificationService.send({
                    recipientId: booking.agent._id,
                    type: 'BOOKING_REMINDER',
                    title: `Upcoming Trip: ${booking.tripDetails.title}`,
                    message: `Booking ${booking.bookingReference} starts on ${booking.tripDetails.startDate.toLocaleDateString()}. Destination: ${booking.tripDetails.destination}`,
                    resourceType: 'booking',
                    resourceId: booking._id,
                    priority: 'medium',
                    sendEmail: true
                });
                sentCount++;
            }

            console.log(`  ✅ [Cron] Booking reminders sent: ${sentCount}`);
        } catch (err) {
            console.error(`  ❌ [Cron] Booking reminder error: ${err.message}`);
        }
    }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
    });

    return task;
};

module.exports = startBookingReminder;
