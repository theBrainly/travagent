// services/leadService.js
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const { hasPermission } = require('../config/role');
const { buildPagination, buildFilterQuery } = require('../utils/helpers');

class LeadService {
  static async createLead(leadData, agentId) {
    leadData.agent = agentId;
    leadData.assignedAt = new Date();
    return await Lead.create(leadData);
  }

  static async getLeads(agentId, agentRole, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    let filter = {};

    if (!hasPermission(agentRole, 'canViewAllLeads')) {
      filter.agent = agentId;
    } else if (query.agentId) {
      filter.agent = query.agentId;
    }

    // Step 6: Advanced filters
    // Status (comma-separated support)
    if (query.status) {
      filter.status = query.status.includes(',')
        ? { $in: query.status.split(',').map(s => s.trim()) }
        : query.status;
    }
    // Source (comma-separated)
    if (query.source) {
      filter.source = query.source.includes(',')
        ? { $in: query.source.split(',').map(s => s.trim()) }
        : query.source;
    }
    // Priority
    if (query.priority) {
      filter.priority = query.priority.includes(',')
        ? { $in: query.priority.split(',').map(s => s.trim()) }
        : query.priority;
    }
    // Assigned agent
    if (query.assignedAgent) filter.agent = query.assignedAgent;

    // Date range
    if (query.createdFrom || query.createdTo) {
      filter.createdAt = {};
      if (query.createdFrom) filter.createdAt.$gte = new Date(query.createdFrom);
      if (query.createdTo) filter.createdAt.$lte = new Date(query.createdTo);
    }

    // Text search
    if (query.search) {
      filter.$or = [
        { 'contactInfo.firstName': { $regex: query.search, $options: 'i' } },
        { 'contactInfo.lastName': { $regex: query.search, $options: 'i' } },
        { 'contactInfo.email': { $regex: query.search, $options: 'i' } },
        { leadReference: { $regex: query.search, $options: 'i' } }
      ];
    }

    if (query.followUpToday === 'true') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      filter.nextFollowUpDate = { $gte: today, $lt: tomorrow };
    }

    if (query.overdue === 'true') {
      filter.nextFollowUpDate = { $lt: new Date() };
      filter.status = { $nin: ['converted', 'lost'] };
    }

    const total = await Lead.countDocuments(filter);
    const { pagination, startIndex } = buildPagination(page, limit, total);

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? '' : '-';
    const defaultSort = sortBy === 'score' ? '-score' : `${sortOrder}${sortBy}`;

    const leads = await Lead.find(filter)
      .populate('agent', 'firstName lastName email')
      .sort(defaultSort)
      .skip(startIndex).limit(limit);

    return { leads, pagination };
  }

  static async getLeadById(leadId) {
    const lead = await Lead.findById(leadId)
      .populate('agent', 'firstName lastName email phone')
      .populate('convertedToBooking', 'bookingReference status')
      .populate('convertedToCustomer', 'firstName lastName email')
      .populate('followUps.conductedBy', 'firstName lastName');
    if (!lead) throw { statusCode: 404, message: 'Lead not found' };
    return lead;
  }

  static async updateLead(leadId, updateData, agentId, agentRole) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw { statusCode: 404, message: 'Lead not found' };
    if (!hasPermission(agentRole, 'canViewAllLeads') && lead.agent.toString() !== agentId.toString()) {
      throw { statusCode: 403, message: 'Not authorized' };
    }
    if (updateData.status === 'lost' && lead.status !== 'lost') updateData.lostAt = new Date();

    return await Lead.findByIdAndUpdate(leadId, updateData, { new: true, runValidators: true });
  }

  static async addFollowUp(leadId, followUpData, agentId, agentRole) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw { statusCode: 404, message: 'Lead not found' };
    if (!hasPermission(agentRole, 'canViewAllLeads') && lead.agent.toString() !== agentId.toString()) {
      throw { statusCode: 403, message: 'Not authorized to add follow-up to this lead' };
    }

    followUpData.conductedBy = agentId;
    followUpData.date = new Date();
    lead.followUps.push(followUpData);
    if (followUpData.nextFollowUp) lead.nextFollowUpDate = followUpData.nextFollowUp;
    if (lead.status === 'new') lead.status = 'contacted';

    await lead.save();
    return lead;
  }

  static async convertLeadToBooking(leadId, bookingData, agentId) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw { statusCode: 404, message: 'Lead not found' };
    if (lead.status === 'converted') throw { statusCode: 400, message: 'Already converted' };
    if (lead.status === 'lost') throw { statusCode: 400, message: 'Cannot convert lost lead' };

    let customer = await Customer.findOne({ email: lead.contactInfo.email, agent: agentId });
    if (!customer) {
      customer = await Customer.create({
        agent: agentId, firstName: lead.contactInfo.firstName, lastName: lead.contactInfo.lastName,
        email: lead.contactInfo.email, phone: lead.contactInfo.phone,
        address: { city: lead.contactInfo.city, country: lead.contactInfo.country },
        preferences: {
          tripType: lead.enquiryDetails.tripType ? [lead.enquiryDetails.tripType] : [],
          budgetRange: lead.enquiryDetails.budgetRange || {},
          preferredDestinations: lead.enquiryDetails.destination || []
        }
      });
    }

    const booking = await Booking.create({
      agent: agentId, customer: customer._id, lead: lead._id,
      bookingType: bookingData.bookingType || 'package',
      tripDetails: {
        title: bookingData.title || `Trip to ${lead.enquiryDetails.destination?.join(', ') || 'TBD'}`,
        tripType: lead.enquiryDetails.tripType,
        destination: lead.enquiryDetails.destination?.[0] || bookingData.destination,
        startDate: bookingData.startDate || lead.enquiryDetails.startDate,
        endDate: bookingData.endDate || lead.enquiryDetails.endDate
      },
      travelers: lead.enquiryDetails.numberOfTravelers || { adults: 1 },
      pricing: {
        basePrice: bookingData.basePrice || 0,
        totalAmount: bookingData.totalAmount || bookingData.basePrice || 0
      },
      status: 'pending',
      statusHistory: [{ status: 'pending', changedAt: new Date(), changedBy: agentId, notes: `Converted from lead ${lead.leadReference}` }]
    });

    lead.status = 'converted';
    lead.convertedToBooking = booking._id;
    lead.convertedToCustomer = customer._id;
    lead.convertedAt = new Date();
    await lead.save();

    return { lead, customer, booking };
  }

  static async assignLead(leadId, targetAgentId) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw { statusCode: 404, message: 'Lead not found' };
    lead.agent = targetAgentId;
    lead.assignedAt = new Date();
    await lead.save();
    return lead;
  }

  static async getLeadStats(agentId, agentRole) {
    let match = {};
    if (!hasPermission(agentRole, 'canViewAllLeads')) match.agent = agentId;

    const statusBreakdown = await Lead.aggregate([
      { $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const sourceBreakdown = await Lead.aggregate([
      { $match: match },
      { $group: { _id: '$source', count: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } }
    ]);

    const conversionRate = await Lead.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
      { $project: { total: 1, converted: 1, rate: { $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$converted', '$total'] }, 100] }] } } }
    ]);

    return { statusBreakdown, sourceBreakdown, conversionRate: conversionRate[0] || { total: 0, converted: 0, rate: 0 } };
  }
}

module.exports = LeadService;