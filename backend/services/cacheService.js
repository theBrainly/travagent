// services/cacheService.js
const { getRedisClient, isConnected } = require('../config/redis');

// Default TTLs in seconds
const TTL = {
    SHORT: 120,        // 2 min — dashboard stats
    MEDIUM: 300,       // 5 min — lists (bookings, leads, commissions)
    LONG: 600,         // 10 min — customers
    AGENT_STATS: 180   // 3 min — agent dashboard stats
};

class CacheService {
    /**
     * Get cached data by key
     */
    static async get(key) {
        if (!isConnected()) return null;
        try {
            const client = getRedisClient();
            const data = await client.get(key);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        } catch (err) {
            console.error(`Cache GET error [${key}]:`, err.message);
            return null;
        }
    }

    /**
     * Set data in cache with TTL
     */
    static async set(key, data, ttlSeconds = TTL.MEDIUM) {
        if (!isConnected()) return false;
        try {
            const client = getRedisClient();
            await client.setex(key, ttlSeconds, JSON.stringify(data));
            return true;
        } catch (err) {
            console.error(`Cache SET error [${key}]:`, err.message);
            return false;
        }
    }

    /**
     * Delete a single cache key
     */
    static async del(key) {
        if (!isConnected()) return false;
        try {
            const client = getRedisClient();
            await client.del(key);
            return true;
        } catch (err) {
            console.error(`Cache DEL error [${key}]:`, err.message);
            return false;
        }
    }

    /**
     * Delete all keys matching a pattern (e.g., 'bookings:*')
     */
    static async delPattern(pattern) {
        if (!isConnected()) return false;
        try {
            const client = getRedisClient();
            let cursor = '0';
            do {
                const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = newCursor;
                if (keys.length > 0) {
                    await client.del(...keys);
                }
            } while (cursor !== '0');
            return true;
        } catch (err) {
            console.error(`Cache DEL_PATTERN error [${pattern}]:`, err.message);
            return false;
        }
    }

    /**
     * Flush all cache (admin only)
     */
    static async flush() {
        if (!isConnected()) return false;
        try {
            const client = getRedisClient();
            await client.flushdb();
            return true;
        } catch (err) {
            console.error('Cache FLUSH error:', err.message);
            return false;
        }
    }

    /**
     * Generate a consistent cache key from parts
     */
    static generateKey(...parts) {
        return parts.filter(Boolean).join(':');
    }

    /**
     * Invalidation map — which mutations invalidate which cache patterns
     */
    static async invalidate(resourceType) {
        const invalidationMap = {
            booking: ['bookings:*', 'dashboard:*', 'agent:stats:*'],
            lead: ['leads:*', 'dashboard:*', 'agent:stats:*'],
            payment: ['payments:*', 'dashboard:*', 'bookings:*', 'agent:stats:*'],
            customer: ['customers:*', 'dashboard:*', 'agent:stats:*'],
            commission: ['commissions:*', 'dashboard:*', 'agent:stats:*'],
            agent: ['agent:*', 'dashboard:*'],
            itinerary: ['itineraries:*']
        };

        const patterns = invalidationMap[resourceType] || [];
        const promises = patterns.map(pattern => CacheService.delPattern(pattern));
        await Promise.allSettled(promises);
    }
}

module.exports = { CacheService, TTL };
