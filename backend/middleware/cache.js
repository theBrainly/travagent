// middleware/cache.js
const { CacheService, TTL } = require('../services/cacheService');

/**
 * Express cache middleware factory
 * Usage: router.get('/', cacheMiddleware('bookings:list', TTL.MEDIUM), controller.getAll)
 * 
 * Builds cache key from prefix + agent ID + query params
 * Sets X-Cache header: HIT or MISS
 */
const cacheMiddleware = (prefix, ttlSeconds = TTL.MEDIUM) => {
    return async (req, res, next) => {
        try {
            // Build cache key from prefix, agent ID, and sorted query params
            const agentId = req.agent?._id?.toString() || 'anon';
            const queryString = Object.keys(req.query)
                .sort()
                .map(k => `${k}=${req.query[k]}`)
                .join('&');

            const cacheKey = CacheService.generateKey(prefix, agentId, queryString || 'default');

            // Try to get from cache
            const cached = await CacheService.get(cacheKey);
            if (cached) {
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);
                return res.status(200).json(cached);
            }

            // Cache MISS — intercept res.json to cache the response
            res.set('X-Cache', 'MISS');
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
                    CacheService.set(cacheKey, body, ttlSeconds).catch(() => { });
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            // If cache fails, just proceed without caching
            next();
        }
    };
};

module.exports = { cacheMiddleware };
