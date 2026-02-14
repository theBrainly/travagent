// config/redis.js
const Redis = require('ioredis');

let redisClient = null;
let isRedisConnected = false;

const connectRedis = () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    if (process.env.CACHE_ENABLED === 'false') {
        console.log('  ⚠️  Redis caching is DISABLED via CACHE_ENABLED=false');
        return null;
    }

    try {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5) {
                    console.error('  ❌ Redis: Max retry attempts reached. Running without cache.');
                    return null; // Stop retrying
                }
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
            connectTimeout: 5000
        });

        redisClient.on('connect', () => {
            isRedisConnected = true;
            console.log('  ✅ Redis connected successfully');
        });

        redisClient.on('error', (err) => {
            isRedisConnected = false;
            console.error(`  ❌ Redis error: ${err.message}`);
        });

        redisClient.on('close', () => {
            isRedisConnected = false;
            console.log('  ⚠️  Redis connection closed');
        });

        redisClient.on('reconnecting', () => {
            console.log('  🔄 Redis reconnecting...');
        });

        // Attempt connection
        redisClient.connect().catch((err) => {
            console.error(`  ❌ Redis initial connection failed: ${err.message}`);
            console.log('  ⚠️  Server will run without caching (graceful degradation)');
            isRedisConnected = false;
        });

        return redisClient;
    } catch (err) {
        console.error(`  ❌ Redis init error: ${err.message}`);
        return null;
    }
};

const getRedisClient = () => redisClient;
const isConnected = () => isRedisConnected;

const gracefulShutdown = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            console.log('  Redis connection closed gracefully');
        } catch (err) {
            console.error(`  Redis shutdown error: ${err.message}`);
        }
    }
};

module.exports = { connectRedis, getRedisClient, isConnected, gracefulShutdown };
