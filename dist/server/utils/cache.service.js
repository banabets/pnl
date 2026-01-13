"use strict";
/**
 * Cache Service
 * Provides caching functionality with Redis (if available) or in-memory fallback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const logger_1 = require("../logger");
class CacheService {
    constructor() {
        this.memoryCache = new Map();
        this.redisClient = null;
        this.useRedis = false;
        this.initializeRedis();
    }
    async initializeRedis() {
        try {
            if (process.env.REDIS_URL) {
                const Redis = require('ioredis');
                this.redisClient = new Redis(process.env.REDIS_URL, {
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                });
                this.redisClient.on('error', (err) => {
                    logger_1.log.warn('Redis connection error, falling back to memory cache', { error: err.message });
                    this.useRedis = false;
                });
                this.redisClient.on('connect', () => {
                    logger_1.log.info('Redis connected successfully');
                    this.useRedis = true;
                });
                // Test connection
                await this.redisClient.ping();
                this.useRedis = true;
                logger_1.log.info('Using Redis for caching');
            }
            else {
                logger_1.log.info('Redis not configured, using in-memory cache');
            }
        }
        catch (error) {
            logger_1.log.warn('Failed to initialize Redis, using in-memory cache', { error: error.message });
            this.useRedis = false;
        }
    }
    /**
     * Get value from cache
     */
    async get(key) {
        try {
            if (this.useRedis && this.redisClient) {
                const data = await this.redisClient.get(key);
                if (data) {
                    return JSON.parse(data);
                }
                return null;
            }
            else {
                // Memory cache
                const cached = this.memoryCache.get(key);
                if (cached && cached.expires > Date.now()) {
                    return cached.value;
                }
                if (cached) {
                    this.memoryCache.delete(key);
                }
                return null;
            }
        }
        catch (error) {
            logger_1.log.error('Cache get error', { key, error: error.message });
            return null;
        }
    }
    /**
     * Set value in cache
     */
    async set(key, value, options = {}) {
        try {
            const ttl = options.ttl || 3600; // Default 1 hour
            if (this.useRedis && this.redisClient) {
                await this.redisClient.setex(key, ttl, JSON.stringify(value));
            }
            else {
                // Memory cache
                this.memoryCache.set(key, {
                    value,
                    expires: Date.now() + ttl * 1000,
                });
                // Cleanup expired entries periodically
                if (this.memoryCache.size > 1000) {
                    this.cleanupMemoryCache();
                }
            }
        }
        catch (error) {
            logger_1.log.error('Cache set error', { key, error: error.message });
        }
    }
    /**
     * Delete value from cache
     */
    async delete(key) {
        try {
            if (this.useRedis && this.redisClient) {
                await this.redisClient.del(key);
            }
            else {
                this.memoryCache.delete(key);
            }
        }
        catch (error) {
            logger_1.log.error('Cache delete error', { key, error: error.message });
        }
    }
    /**
     * Delete multiple keys matching pattern
     */
    async deletePattern(pattern) {
        try {
            if (this.useRedis && this.redisClient) {
                const keys = await this.redisClient.keys(pattern);
                if (keys.length > 0) {
                    await this.redisClient.del(...keys);
                }
            }
            else {
                // Memory cache - simple pattern matching
                const regex = new RegExp(pattern.replace('*', '.*'));
                for (const key of this.memoryCache.keys()) {
                    if (regex.test(key)) {
                        this.memoryCache.delete(key);
                    }
                }
            }
        }
        catch (error) {
            logger_1.log.error('Cache delete pattern error', { pattern, error: error.message });
        }
    }
    /**
     * Clear all cache
     */
    async clear() {
        try {
            if (this.useRedis && this.redisClient) {
                await this.redisClient.flushdb();
            }
            else {
                this.memoryCache.clear();
            }
        }
        catch (error) {
            logger_1.log.error('Cache clear error', { error: error.message });
        }
    }
    /**
     * Cleanup expired entries from memory cache
     */
    cleanupMemoryCache() {
        const now = Date.now();
        for (const [key, cached] of this.memoryCache.entries()) {
            if (cached.expires <= now) {
                this.memoryCache.delete(key);
            }
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        if (this.useRedis && this.redisClient) {
            return {
                type: 'redis',
                connected: this.redisClient.status === 'ready',
            };
        }
        else {
            return {
                type: 'memory',
                size: this.memoryCache.size,
            };
        }
    }
}
exports.cacheService = new CacheService();
//# sourceMappingURL=cache.service.js.map