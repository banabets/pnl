/**
 * Cache Service
 * Provides caching functionality with Redis (if available) or in-memory fallback
 */
interface CacheOptions {
    ttl?: number;
}
declare class CacheService {
    private memoryCache;
    private redisClient;
    private useRedis;
    constructor();
    private initializeRedis;
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache
     */
    set(key: string, value: any, options?: CacheOptions): Promise<void>;
    /**
     * Delete value from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Delete multiple keys matching pattern
     */
    deletePattern(pattern: string): Promise<void>;
    /**
     * Clear all cache
     */
    clear(): Promise<void>;
    /**
     * Cleanup expired entries from memory cache
     */
    private cleanupMemoryCache;
    /**
     * Get cache statistics
     */
    getStats(): {
        type: string;
        connected: boolean;
        size?: undefined;
    } | {
        type: string;
        size: number;
        connected?: undefined;
    };
}
export declare const cacheService: CacheService;
export {};
//# sourceMappingURL=cache.service.d.ts.map