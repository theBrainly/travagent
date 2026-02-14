const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Commission = require('../models/Commission');
const ApiResponse = require('../utils/apiResponse');
const { hasPermission } = require('../config/role');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
    try {
        const canViewAll = hasPermission(req.agent.role, 'canViewAllBookings');
        const filter = canViewAll ? {} : { agent: req.agent._id };

        const totalCustomers = await Customer.countDocuments(filter);
        const totalBookings = await Booking.countDocuments(filter);

        // Calculate total revenue from confirmed/completed bookings
        const revenueAggregation = await Booking.aggregate([
            { $match: { ...filter, status: { $in: ['confirmed', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
        ]);
        const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].total : 0;

        // Calculate total commission from commission model
        const commissionAggregation = await Commission.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$totalEarning' } } }
        ]);
        const totalCommission = commissionAggregation.length > 0 ? commissionAggregation[0].total : 0;

        const pendingBookings = await Booking.countDocuments({ ...filter, status: 'pending' });
        const confirmedBookings = await Booking.countDocuments({ ...filter, status: 'confirmed' });

        const totalLeads = await Lead.countDocuments(filter);
        const convertedLeads = await Lead.countDocuments({ ...filter, status: 'converted' });
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        ApiResponse.success(res, {
            totalCustomers,
            totalBookings,
            totalRevenue,
            totalCommission,
            pendingBookings,
            confirmedBookings,
            totalLeads,
            conversionRate
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get recent bookings
// @route   GET /api/dashboard/recent-bookings
// @access  Private
exports.getRecentBookings = async (req, res, next) => {
    try {
        const canViewAll = hasPermission(req.agent.role, 'canViewAllBookings');
        const filter = canViewAll ? {} : { agent: req.agent._id };

        const bookings = await Booking.find(filter)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('customer', 'firstName lastName email')
            .select('bookingReference tripDetails.title tripDetails.destination status pricing.totalAmount createdAt');

        ApiResponse.success(res, bookings);
    } catch (error) {
        next(error);
    }
};
