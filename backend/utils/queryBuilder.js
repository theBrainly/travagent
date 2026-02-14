// utils/queryBuilder.js

/**
 * Reusable, chainable query builder for MongoDB queries.
 * Supports text search, field filters, date/number ranges, sorting, and pagination.
 *
 * Usage:
 *   const qb = new QueryBuilder(Model, req.query)
 *     .search(['firstName', 'lastName', 'email'])
 *     .filter(['status', 'source', 'priority'])
 *     .dateRange('createdAt', 'createdFrom', 'createdTo')
 *     .numberRange('pricing.totalAmount', 'minAmount', 'maxAmount')
 *     .inArray('status', 'status')
 *     .sort('-createdAt')
 *     .paginate();
 *   const { data, pagination } = await qb.execute(populateOpts);
 */

class QueryBuilder {
    constructor(model, queryParams = {}) {
        this.model = model;
        this.queryParams = queryParams;
        this.filters = {};
        this.sortStr = '-createdAt';
        this.page = parseInt(queryParams.page) || 1;
        this.limit = parseInt(queryParams.limit) || 10;
        this.populateOpts = [];
    }

    /**
     * Regex search across multiple fields using $or.
     * Reads the `search` query param.
     */
    search(fields = []) {
        const searchTerm = this.queryParams.search;
        if (searchTerm && fields.length > 0) {
            this.filters.$or = fields.map(field => ({
                [field]: { $regex: searchTerm, $options: 'i' }
            }));
        }
        return this;
    }

    /**
     * MongoDB $text search (requires a text index on the model).
     */
    textSearch() {
        const searchTerm = this.queryParams.search;
        if (searchTerm) {
            this.filters.$text = { $search: searchTerm };
        }
        return this;
    }

    /**
     * Apply exact-match filters for specified fields.
     * Field values are taken directly from query params.
     */
    filter(allowedFields = []) {
        for (const field of allowedFields) {
            if (this.queryParams[field] !== undefined && this.queryParams[field] !== '') {
                this.filters[field] = this.queryParams[field];
            }
        }
        return this;
    }

    /**
     * Apply a predefined filter object (merge into existing filters).
     */
    applyFilter(filterObj) {
        this.filters = { ...this.filters, ...filterObj };
        return this;
    }

    /**
     * Filter by date range on a given field.
     * Reads fromParam and toParam from query params.
     */
    dateRange(field, fromParam, toParam) {
        const from = this.queryParams[fromParam];
        const to = this.queryParams[toParam];
        if (from || to) {
            this.filters[field] = {};
            if (from) this.filters[field].$gte = new Date(from);
            if (to) this.filters[field].$lte = new Date(to);
        }
        return this;
    }

    /**
     * Filter by number range on a given field.
     * Reads minParam and maxParam from query params.
     */
    numberRange(field, minParam, maxParam) {
        const min = this.queryParams[minParam];
        const max = this.queryParams[maxParam];
        if (min || max) {
            this.filters[field] = {};
            if (min) this.filters[field].$gte = parseFloat(min);
            if (max) this.filters[field].$lte = parseFloat(max);
        }
        return this;
    }

    /**
     * Filter by comma-separated values using $in.
     * E.g., ?status=confirmed,completed → { status: { $in: ['confirmed', 'completed'] } }
     */
    inArray(field, param) {
        const value = this.queryParams[param || field];
        if (value && typeof value === 'string' && value.includes(',')) {
            this.filters[field] = { $in: value.split(',').map(v => v.trim()) };
        }
        return this;
    }

    /**
     * Apply sorting from sortBy and sortOrder query params, or a default.
     */
    sort(defaultSort = '-createdAt') {
        const sortBy = this.queryParams.sortBy;
        const sortOrder = this.queryParams.sortOrder === 'asc' ? '' : '-';
        this.sortStr = sortBy ? `${sortOrder}${sortBy}` : defaultSort;
        return this;
    }

    /**
     * Set populate options.
     */
    populate(opts) {
        this.populateOpts = opts;
        return this;
    }

    /**
     * Execute the query. Returns { data, pagination }.
     */
    async execute() {
        const total = await this.model.countDocuments(this.filters);

        const totalPages = Math.ceil(total / this.limit);
        const startIndex = (this.page - 1) * this.limit;

        const pagination = {
            page: this.page,
            limit: this.limit,
            totalDocs: total,
            totalPages,
            hasNext: this.page < totalPages,
            hasPrev: this.page > 1
        };

        let query = this.model.find(this.filters)
            .sort(this.sortStr)
            .skip(startIndex)
            .limit(this.limit);

        // Apply populates
        if (Array.isArray(this.populateOpts)) {
            for (const pop of this.populateOpts) {
                query = query.populate(pop);
            }
        }

        const data = await query;

        return { data, pagination };
    }
}

module.exports = QueryBuilder;
