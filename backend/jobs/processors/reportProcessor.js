// jobs/processors/reportProcessor.js
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');
const Lead = require('../../models/Lead');
const Customer = require('../../models/Customer');

/**
 * Process report generation jobs
 * Generates JSON data summaries for bookings, payments, leads
 */
const processReportJob = async (job) => {
    const { reportType, filters = {}, requestedBy } = job.data;

    console.log(`  📊 [ReportProcessor] Generating "${reportType}" report for agent ${requestedBy}`);

    let reportData;

    switch (reportType) {
        case 'bookings': {
            const match = {};
            if (filters.startDate) match.createdAt = { $gte: new Date(filters.startDate) };
            if (filters.endDate) match.createdAt = { ...match.createdAt, $lte: new Date(filters.endDate) };
            if (filters.status) match.status = filters.status;

            reportData = await Booking.find(match)
                .populate('agent', 'firstName lastName email')
                .populate('customer', 'firstName lastName email')
                .sort('-createdAt')
                .lean();
            break;
        }

        case 'payments': {
            const match = {};
            if (filters.startDate) match.createdAt = { $gte: new Date(filters.startDate) };
            if (filters.endDate) match.createdAt = { ...match.createdAt, $lte: new Date(filters.endDate) };
            if (filters.status) match.status = filters.status;

            reportData = await Payment.find(match)
                .populate('agent', 'firstName lastName email')
                .populate('booking', 'bookingReference')
                .sort('-createdAt')
                .lean();
            break;
        }

        case 'leads': {
            const match = {};
            if (filters.startDate) match.createdAt = { $gte: new Date(filters.startDate) };
            if (filters.endDate) match.createdAt = { ...match.createdAt, $lte: new Date(filters.endDate) };
            if (filters.status) match.status = filters.status;

            reportData = await Lead.find(match)
                .populate('agent', 'firstName lastName email')
                .sort('-createdAt')
                .lean();
            break;
        }

        case 'customers': {
            reportData = await Customer.find()
                .populate('agent', 'firstName lastName email')
                .sort('-createdAt')
                .lean();
            break;
        }

        default:
            throw new Error(`Unknown report type: ${reportType}`);
    }

    const report = {
        reportType,
        generatedAt: new Date().toISOString(),
        requestedBy,
        filters,
        totalRecords: reportData.length,
        data: reportData
    };

    console.log(`  ✅ [ReportProcessor] Report "${reportType}" generated — ${reportData.length} records`);

    return report;
};

module.exports = processReportJob;
