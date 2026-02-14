// services/commissionService.js
const Commission = require('../models/Commission');
const Agent = require('../models/Agent');
const { COMMISSION_TIERS } = require('../utils/constants');
const { hasPermission } = require('../config/role');
const { buildPagination } = require('../utils/helpers');

class CommissionService {
  static getCommissionTier(amount) {
    for (const [tier, range] of Object.entries(COMMISSION_TIERS)) {
      if (amount >= range.min && amount <= range.max) return { tier: tier.toLowerCase(), rate: range.rate };
    }
    return { tier: 'standard', rate: 10 };
  }

  static async createCommission(booking, agentId) {
    const agent = await Agent.findById(agentId);
    if (!agent) throw { statusCode: 404, message: 'Agent not found' };

    const existing = await Commission.findOne({ booking: booking._id });
    if (existing) return existing;

    const bookingAmount = booking.pricing.totalAmount;
    const { tier, rate } = this.getCommissionTier(bookingAmount);
    const finalRate = agent.commissionRate || rate;
    const commissionAmount = (bookingAmount * finalRate) / 100;
    let bonusAmount = 0;
    if (bookingAmount > 500000) bonusAmount = commissionAmount * 0.1;

    return await Commission.create({
      agent: agentId, booking: booking._id, bookingAmount, commissionRate: finalRate,
      commissionAmount, tier, bonusAmount, totalEarning: commissionAmount + bonusAmount, status: 'pending'
    });
  }

  static async getAgentCommissions(agentId, agentRole, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    let filter = {};

    if (!hasPermission(agentRole, 'canApproveCommissions')) {
      filter.agent = agentId;
    } else if (query.agentId) {
      filter.agent = query.agentId;
    }

    if (query.status) filter.status = query.status;
    if (query.month) filter.month = parseInt(query.month);
    if (query.year) filter.year = parseInt(query.year);

    const total = await Commission.countDocuments(filter);
    const { pagination, startIndex } = buildPagination(page, limit, total);

    const commissions = await Commission.find(filter)
      .populate('agent', 'firstName lastName email')
      .populate('booking', 'bookingReference tripDetails.title pricing.totalAmount')
      .sort('-createdAt').skip(startIndex).limit(limit);

    return { commissions, pagination };
  }

  static async approveCommission(commissionId, adminId) {
    const commission = await Commission.findById(commissionId);
    if (!commission) throw { statusCode: 404, message: 'Commission not found' };
    if (commission.status !== 'pending') throw { statusCode: 400, message: `Already '${commission.status}'` };

    commission.status = 'approved';
    commission.approvedBy = adminId;
    commission.approvedAt = new Date();
    await commission.save();
    return commission;
  }

  static async markCommissionPaid(commissionId, paymentDetails, adminId) {
    const commission = await Commission.findById(commissionId);
    if (!commission) throw { statusCode: 404, message: 'Commission not found' };
    if (commission.status !== 'approved') throw { statusCode: 400, message: 'Must be approved before payment' };

    commission.status = 'paid';
    commission.paymentDetails = {
      paidAt: new Date(), paymentMethod: paymentDetails.paymentMethod,
      transactionReference: paymentDetails.transactionReference, paidBy: adminId
    };
    await commission.save();
    await Agent.findByIdAndUpdate(commission.agent, { $inc: { totalEarnings: commission.totalEarning } });
    return commission;
  }

  static async getCommissionSummary(agentId, agentRole) {
    let match = {};
    if (!hasPermission(agentRole, 'canApproveCommissions')) match.agent = agentId;

    const summary = await Commission.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalEarning' } } }
    ]);

    const monthlySummary = await Commission.aggregate([
      { $match: { ...match, status: { $in: ['approved', 'paid'] } } },
      { $group: { _id: { year: '$year', month: '$month' }, totalEarning: { $sum: '$totalEarning' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } }, { $limit: 12 }
    ]);

    return { statusSummary: summary, monthlySummary };
  }
}

module.exports = CommissionService;