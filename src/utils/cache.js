// File: src/utils/cache.js

const redis = require('redis');
const { logger } = require('./logger'); // Corrected path: references logger.js in the same utils folder

// Initialize Redis Client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on('connect', () => {
    logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
    logger.error('Redis Client Error', err);
});

// Connect to Redis immediately
(async () => {
    try {
        await redisClient.connect();
    } catch (e) {
        logger.error('Failed to connect to Redis on startup:', e.message);
    }
})();


/**
 * Retrieves an item from the cache and parses it as JSON.
 * @param {string} key - The Redis key to retrieve.
 * @returns {Promise<Array|object|null>} The parsed value or null if not found.
 */
async function getCache(key) {
    try {
        const data = await redisClient.get(key);
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        logger.error(`Error retrieving key ${key} from cache:`, error);
        return null;
    }
}

/**
 * Stores an item in the cache after stringifying it, with an optional expiry.
 * @param {string} key - The Redis key to store the data under.
 * @param {any} value - The JavaScript value to store (will be stringified).
 * @param {number} [expirySeconds] - Optional expiry time in seconds.
 * @returns {Promise<void>}
 */
async function setCache(key, value, expirySeconds) {
    try {
        const data = JSON.stringify(value);
        if (expirySeconds) {
            await redisClient.set(key, data, {
                EX: expirySeconds,
            });
        } else {
            await redisClient.set(key, data);
        }
    } catch (error) {
        logger.error(`Error setting key ${key} in cache:`, error);
    }
}

module.exports = {
    getCache,
    setCache,
    redisClient 
};