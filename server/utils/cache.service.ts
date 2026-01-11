/**
 * Cache Service
 * Provides caching functionality with Redis (if available) or in-memory fallback
 */

import { log } from '../logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

class CacheService {
  private memoryCache: Map<string, { value: any; expires: number }> = new Map();
  private redisClient: any = null;
  private useRedis: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        const Redis = require('ioredis');
        this.redisClient = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        this.redisClient.on('error', (err: Error) => {
          log.warn('Redis connection error, falling back to memory cache', { error: err.message });
          this.useRedis = false;
        });

        this.redisClient.on('connect', () => {
          log.info('Redis connected successfully');
          this.useRedis = true;
        });

        // Test connection
        await this.redisClient.ping();
        this.useRedis = true;
        log.info('Using Redis for caching');
      } else {
        log.info('Redis not configured, using in-memory cache');
      }
    } catch (error) {
      log.warn('Failed to initialize Redis, using in-memory cache', { error: (error as Error).message });
      this.useRedis = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redisClient) {
        const data = await this.redisClient.get(key);
        if (data) {
          return JSON.parse(data);
        }
        return null;
      } else {
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
    } catch (error) {
      log.error('Cache get error', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || 3600; // Default 1 hour

      if (this.useRedis && this.redisClient) {
        await this.redisClient.setex(key, ttl, JSON.stringify(value));
      } else {
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
    } catch (error) {
      log.error('Cache set error', { key, error: (error as Error).message });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      log.error('Cache delete error', { key, error: (error as Error).message });
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } else {
        // Memory cache - simple pattern matching
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      log.error('Cache delete pattern error', { pattern, error: (error as Error).message });
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushdb();
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      log.error('Cache clear error', { error: (error as Error).message });
    }
  }

  /**
   * Cleanup expired entries from memory cache
   */
  private cleanupMemoryCache() {
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
    } else {
      return {
        type: 'memory',
        size: this.memoryCache.size,
      };
    }
  }
}

export const cacheService = new CacheService();

