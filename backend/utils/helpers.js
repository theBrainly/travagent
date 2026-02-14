// utils/helpers.js
const crypto = require('crypto');

module.exports = {
  // Generate unique reference number
  generateRefNumber: (prefix = 'BK') => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  },

  // Calculate date difference in days
  dateDiffInDays: (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Build pagination
  buildPagination: (page, limit, total) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      limit
    };

    if (endIndex < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    return { pagination, startIndex };
  },

  // Build filter query from request query params
  buildFilterQuery: (query, allowedFields) => {
    const filter = {};
    for (const field of allowedFields) {
      if (query[field]) {
        if (typeof query[field] === 'string' && !['status', 'role', 'type', 'source', 'priority'].includes(field)) {
          filter[field] = { $regex: query[field], $options: 'i' };
        } else {
          filter[field] = query[field];
        }
      }
    }

    // Date range filtering
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    // Price range filtering
    if (query.minPrice || query.maxPrice) {
      filter.totalAmount = {};
      if (query.minPrice) filter.totalAmount.$gte = parseFloat(query.minPrice);
      if (query.maxPrice) filter.totalAmount.$lte = parseFloat(query.maxPrice);
    }

    return filter;
  }
};