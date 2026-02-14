// services/conflictService.js
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

class ConflictService {
    /**
     * Check if a booking conflicts with existing bookings for the same customer + destination + overlapping dates.
     * Returns the conflicting booking or null if no conflict.
     */
    static async checkBookingConflict(customerId, destination, startDate, endDate, excludeBookingId = null) {
        if (!customerId || !destination || !startDate || !endDate) return null;

        const query = {
            customer: customerId,
            'tripDetails.destination': destination,
            status: { $nin: ['cancelled', 'refunded'] },
            $or: [
                // Overlap: existing booking starts before new ends AND existing booking ends after new starts
                {
                    'tripDetails.startDate': { $lte: new Date(endDate) },
                    'tripDetails.endDate': { $gte: new Date(startDate) }
                }
            ]
        };

        // Exclude self when updating
        if (excludeBookingId) {
            query._id = { $ne: excludeBookingId };
        }

        const conflict = await Booking.findOne(query)
            .select('bookingReference tripDetails.destination tripDetails.startDate tripDetails.endDate status customer')
            .populate('customer', 'firstName lastName');

        return conflict;
    }

    /**
     * Check for duplicate payment: same booking + same amount + completed within a time window.
     * Returns the duplicate payment or null.
     */
    static async checkDuplicatePayment(bookingId, amount, windowMinutes = 5) {
        if (!bookingId || !amount) return null;

        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

        const duplicate = await Payment.findOne({
            booking: bookingId,
            amount: amount,
            status: 'completed',
            createdAt: { $gte: windowStart }
        }).select('transactionId amount status createdAt');

        return duplicate;
    }
}

module.exports = ConflictService;
