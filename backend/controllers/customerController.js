// controllers/customerController.js
const Customer = require('../models/Customer');
const ApiResponse = require('../utils/apiResponse');
const { hasPermission } = require('../config/role');
const { buildPagination } = require('../utils/helpers');
const AuditService = require('../services/auditService');
const { CacheService } = require('../services/cacheService');

exports.createCustomer = async (req, res, next) => {
  try {
    req.body.agent = req.agent._id;
    const customer = await Customer.create(req.body);

    // Audit log
    AuditService.logCreate(req, 'Customer', customer._id, `Created customer: ${customer.firstName} ${customer.lastName}`);

    // Invalidate cache
    CacheService.invalidate('customer');

    ApiResponse.created(res, { customer });
  } catch (error) { next(error); }
};

exports.getCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1; const limit = parseInt(req.query.limit) || 10;
    let filter = {};
    if (!hasPermission(req.agent.role, 'canViewAllCustomers')) filter.agent = req.agent._id;
    else if (req.query.agentId) filter.agent = req.query.agentId;

    // Step 6: Advanced filters
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } }, { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }, { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.city) filter['address.city'] = { $regex: req.query.city, $options: 'i' };

    // Date range
    if (req.query.createdFrom || req.query.createdTo) {
      filter.createdAt = {};
      if (req.query.createdFrom) filter.createdAt.$gte = new Date(req.query.createdFrom);
      if (req.query.createdTo) filter.createdAt.$lte = new Date(req.query.createdTo);
    }

    const total = await Customer.countDocuments(filter);
    const { pagination, startIndex } = buildPagination(page, limit, total);

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? '' : '-';
    const sortStr = `${sortOrder}${sortBy}`;

    const customers = await Customer.find(filter).populate('agent', 'firstName lastName').sort(sortStr).skip(startIndex).limit(limit);
    ApiResponse.paginated(res, customers, pagination);
  } catch (error) { next(error); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('agent', 'firstName lastName email').populate('bookings');
    if (!customer) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllCustomers') && customer.agent._id.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);
    ApiResponse.success(res, { customer });
  } catch (error) { next(error); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    let customer = await Customer.findById(req.params.id);
    if (!customer) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canViewAllCustomers') && customer.agent.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);

    const beforeData = { firstName: customer.firstName, lastName: customer.lastName, email: customer.email };
    delete req.body.agent;
    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    // Audit log with before/after
    AuditService.logUpdate(req, 'Customer', customer._id, beforeData, req.body, `Updated customer: ${customer.firstName} ${customer.lastName}`);

    // Invalidate cache
    CacheService.invalidate('customer');

    ApiResponse.success(res, { customer }, 'Updated');
  } catch (error) { next(error); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return ApiResponse.error(res, 'Not found', 404);
    if (!hasPermission(req.agent.role, 'canDeleteAnyCustomer') && customer.agent.toString() !== req.agent._id.toString())
      return ApiResponse.error(res, 'Not authorized', 403);
    const Booking = require('../models/Booking');
    const active = await Booking.countDocuments({ customer: req.params.id, status: { $in: ['pending', 'confirmed', 'in_progress'] } });
    if (active > 0) return ApiResponse.error(res, `Cannot delete with ${active} active bookings`, 400);
    await Customer.findByIdAndDelete(req.params.id);

    // Audit log
    AuditService.logDelete(req, 'Customer', req.params.id, `Deleted customer: ${customer.firstName} ${customer.lastName}`);

    // Invalidate cache
    CacheService.invalidate('customer');

    ApiResponse.success(res, null, 'Deleted');
  } catch (error) { next(error); }
};

exports.getCustomerStats = async (req, res, next) => {
  try {
    const filter = !hasPermission(req.agent.role, 'canViewAllCustomers') ? { agent: req.agent._id } : {};
    const stats = await Customer.aggregate([{ $match: filter }, { $group: { _id: null, totalCustomers: { $sum: 1 }, activeCustomers: { $sum: { $cond: ['$isActive', 1, 0] } }, totalSpentAll: { $sum: '$totalSpent' } } }]);
    const topCustomers = await Customer.find(filter).sort('-totalSpent').limit(10).select('firstName lastName email totalSpent totalTrips loyaltyPoints');
    ApiResponse.success(res, { overview: stats[0] || { totalCustomers: 0 }, topCustomers });
  } catch (error) { next(error); }
};