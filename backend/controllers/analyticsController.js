// controllers/analyticsController.js
const AnalyticsService = require('../services/analyticsService');
const ApiResponse = require('../utils/apiResponse');

exports.getRevenue = async (req, res, next) => {
    try {
        const data = await AnalyticsService.getRevenueAnalytics(req.query);
        ApiResponse.success(res, data, 'Revenue analytics');
    } catch (error) { next(error); }
};

exports.getBookings = async (req, res, next) => {
    try {
        const data = await AnalyticsService.getBookingAnalytics(req.query);
        ApiResponse.success(res, data, 'Booking analytics');
    } catch (error) { next(error); }
};

exports.getConversion = async (req, res, next) => {
    try {
        const data = await AnalyticsService.getConversionAnalytics(req.query);
        ApiResponse.success(res, data, 'Conversion analytics');
    } catch (error) { next(error); }
};

exports.getTopAgents = async (req, res, next) => {
    try {
        const data = await AnalyticsService.getTopAgents(req.query);
        ApiResponse.success(res, data, 'Top agents');
    } catch (error) { next(error); }
};

exports.getMonthlyGrowth = async (req, res, next) => {
    try {
        const data = await AnalyticsService.getMonthlyGrowth();
        ApiResponse.success(res, data, 'Monthly growth');
    } catch (error) { next(error); }
};

exports.getOverview = async (req, res, next) => {
    try {
        const data = await AnalyticsService.getOverview(req.agent._id, req.agent.role);
        ApiResponse.success(res, data, 'Analytics overview');
    } catch (error) { next(error); }
};
