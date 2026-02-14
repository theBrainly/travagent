// services/analyticsService.js
const Booking = require('../models/Booking');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Agent = require('../models/Agent');
const { hasPermission } = require('../config/role');

class AnalyticsService {
    /**
     * Parse period param into a date filter { $gte, $lte }
     */
    static _getDateFilter(period, startDate, endDate) {
        if (startDate || endDate) {
            const filter = {};
            if (startDate) filter.$gte = new Date(startDate);
            if (endDate) filter.$lte = new Date(endDate);
            return filter;
        }

        if (!period || period === 'all') return null;

        const now = new Date();
        const map = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        };

        const days = map[period];
        if (!days) return null;

        const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return { $gte: from, $lte: now };
    }

    /**
     * Determine MongoDB date grouping expression
     */
    static _getGroupByExpr(groupBy = 'month') {
        switch (groupBy) {
            case 'day':
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                };
            case 'week':
                return {
                    year: { $year: '$createdAt' },
                    week: { $week: '$createdAt' }
                };
            case 'month':
            default:
                return {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
        }
    }

    /**
     * GET /api/dashboard/analytics/revenue
     * Revenue breakdowns: by time period, by trip type
     */
    static async getRevenueAnalytics({ period, startDate, endDate, groupBy }) {
        const dateFilter = this._getDateFilter(period, startDate, endDate);
        const matchStage = { status: { $in: ['confirmed', 'completed'] } };
        if (dateFilter) matchStage.createdAt = dateFilter;

        // Revenue by time period
        const revenueByPeriod = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: this._getGroupByExpr(groupBy),
                    totalRevenue: { $sum: '$pricing.totalAmount' },
                    bookingCount: { $sum: 1 },
                    avgBookingValue: { $avg: '$pricing.totalAmount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
        ]);

        // Revenue by trip type
        const revenueByTripType = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$tripDetails.tripType',
                    totalRevenue: { $sum: '$pricing.totalAmount' },
                    bookingCount: { $sum: 1 },
                    avgBookingValue: { $avg: '$pricing.totalAmount' }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Total summary
        const totalSummary = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$pricing.totalAmount' },
                    totalBookings: { $sum: 1 },
                    avgBookingValue: { $avg: '$pricing.totalAmount' },
                    maxBookingValue: { $max: '$pricing.totalAmount' },
                    minBookingValue: { $min: '$pricing.totalAmount' }
                }
            }
        ]);

        return {
            revenueByPeriod,
            revenueByTripType,
            summary: totalSummary[0] || { totalRevenue: 0, totalBookings: 0, avgBookingValue: 0 }
        };
    }

    /**
     * GET /api/dashboard/analytics/bookings
     * Booking trends: by status, by time, by trip type
     */
    static async getBookingAnalytics({ period, startDate, endDate, groupBy }) {
        const dateFilter = this._getDateFilter(period, startDate, endDate);
        const matchStage = {};
        if (dateFilter) matchStage.createdAt = dateFilter;

        // Bookings by status
        const byStatus = await Booking.aggregate([
            { $match: matchStage },
            { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$pricing.totalAmount' } } },
            { $sort: { count: -1 } }
        ]);

        // Bookings by time period
        const byPeriod = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: this._getGroupByExpr(groupBy),
                    totalBookings: { $sum: 1 },
                    confirmedBookings: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, 1, 0] } },
                    cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Bookings by trip type
        const byTripType = await Booking.aggregate([
            { $match: matchStage },
            { $group: { _id: '$tripDetails.tripType', count: { $sum: 1 }, totalRevenue: { $sum: '$pricing.totalAmount' } } },
            { $sort: { count: -1 } }
        ]);

        return { byStatus, byPeriod, byTripType };
    }

    /**
     * GET /api/dashboard/analytics/conversion
     * Lead conversion funnel with drop-off rates
     */
    static async getConversionAnalytics({ period, startDate, endDate }) {
        const dateFilter = this._getDateFilter(period, startDate, endDate);
        const matchStage = {};
        if (dateFilter) matchStage.createdAt = dateFilter;

        // Count leads at each status stage
        const funnel = await Lead.aggregate([
            { $match: matchStage },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Total leads and converted
        const totals = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
                    lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
                    active: { $sum: { $cond: [{ $in: ['$status', ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation']] }, 1, 0] } }
                }
            }
        ]);

        const summary = totals[0] || { total: 0, converted: 0, lost: 0, active: 0 };
        summary.conversionRate = summary.total > 0 ? ((summary.converted / summary.total) * 100).toFixed(2) : 0;
        summary.lossRate = summary.total > 0 ? ((summary.lost / summary.total) * 100).toFixed(2) : 0;

        // Conversion by source
        const bySource = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$source',
                    total: { $sum: 1 },
                    converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 1, total: 1, converted: 1,
                    conversionRate: {
                        $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$converted', '$total'] }, 100] }]
                    }
                }
            },
            { $sort: { total: -1 } }
        ]);

        return { funnel, summary, bySource };
    }

    /**
     * GET /api/dashboard/analytics/top-agents
     * Top agents ranked by revenue and bookings
     */
    static async getTopAgents({ period, startDate, endDate, limit = 10 }) {
        const dateFilter = this._getDateFilter(period, startDate, endDate);
        const matchStage = { status: { $in: ['confirmed', 'completed'] } };
        if (dateFilter) matchStage.createdAt = dateFilter;

        const topAgents = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$agent',
                    totalRevenue: { $sum: '$pricing.totalAmount' },
                    totalBookings: { $sum: 1 },
                    avgBookingValue: { $avg: '$pricing.totalAmount' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: parseInt(limit) || 10 },
            {
                $lookup: {
                    from: 'agents',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'agentInfo'
                }
            },
            { $unwind: { path: '$agentInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    totalRevenue: 1,
                    totalBookings: 1,
                    avgBookingValue: 1,
                    agentName: { $concat: [{ $ifNull: ['$agentInfo.firstName', ''] }, ' ', { $ifNull: ['$agentInfo.lastName', ''] }] },
                    agentEmail: '$agentInfo.email',
                    agentRole: '$agentInfo.role'
                }
            }
        ]);

        return { topAgents };
    }

    /**
     * GET /api/dashboard/analytics/monthly-growth
     * Month-over-month growth for revenue, bookings, leads, customers
     */
    static async getMonthlyGrowth() {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const calcGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return parseFloat((((current - previous) / previous) * 100).toFixed(2));
        };

        // Revenue growth
        const [currentRevenue] = await Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'completed'] }, createdAt: { $gte: currentMonthStart } } },
            { $group: { _id: null, total: { $sum: '$pricing.totalAmount' }, count: { $sum: 1 } } }
        ]);
        const [prevRevenue] = await Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'completed'] }, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$pricing.totalAmount' }, count: { $sum: 1 } } }
        ]);

        // Leads growth
        const currentLeads = await Lead.countDocuments({ createdAt: { $gte: currentMonthStart } });
        const prevLeads = await Lead.countDocuments({ createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } });

        // Customers growth
        const currentCustomers = await Customer.countDocuments({ createdAt: { $gte: currentMonthStart } });
        const prevCustomers = await Customer.countDocuments({ createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } });

        return {
            revenue: {
                current: currentRevenue?.total || 0,
                previous: prevRevenue?.total || 0,
                growth: calcGrowth(currentRevenue?.total || 0, prevRevenue?.total || 0)
            },
            bookings: {
                current: currentRevenue?.count || 0,
                previous: prevRevenue?.count || 0,
                growth: calcGrowth(currentRevenue?.count || 0, prevRevenue?.count || 0)
            },
            leads: {
                current: currentLeads,
                previous: prevLeads,
                growth: calcGrowth(currentLeads, prevLeads)
            },
            customers: {
                current: currentCustomers,
                previous: prevCustomers,
                growth: calcGrowth(currentCustomers, prevCustomers)
            },
            period: {
                currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
                previousMonth: `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}`
            }
        };
    }

    /**
     * GET /api/dashboard/analytics/overview
     * Combined KPIs — accessible by all roles, scoped by agent when not Admin+
     */
    static async getOverview(agentId, agentRole) {
        const canViewAll = hasPermission(agentRole, 'canViewAllBookings');
        const filter = canViewAll ? {} : { agent: agentId };

        const totalBookings = await Booking.countDocuments(filter);
        const totalLeads = await Lead.countDocuments(canViewAll ? {} : { agent: agentId });
        const totalCustomers = await Customer.countDocuments(canViewAll ? {} : { agent: agentId });

        const [revenueResult] = await Booking.aggregate([
            { $match: { ...filter, status: { $in: ['confirmed', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
        ]);

        const pendingBookings = await Booking.countDocuments({ ...filter, status: 'pending' });
        const confirmedBookings = await Booking.countDocuments({ ...filter, status: 'confirmed' });
        const completedBookings = await Booking.countDocuments({ ...filter, status: 'completed' });

        const convertedLeads = await Lead.countDocuments({ ...(canViewAll ? {} : { agent: agentId }), status: 'converted' });
        const conversionRate = totalLeads > 0 ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

        // Recent 6 months revenue trend
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const revenueTrend = await Booking.aggregate([
            { $match: { ...filter, status: { $in: ['confirmed', 'completed'] }, createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$pricing.totalAmount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        return {
            totalBookings,
            totalLeads,
            totalCustomers,
            totalRevenue: revenueResult?.total || 0,
            pendingBookings,
            confirmedBookings,
            completedBookings,
            conversionRate,
            revenueTrend
        };
    }
}

module.exports = AnalyticsService;
