declare class RateLimiter {
    private requests;
    private configs;
    constructor();
    /**
     * Check if a request can be made for a service
     */
    canMakeRequest(service: 'dexscreener' | 'pumpfun' | 'helius'): boolean;
    /**
     * Record a request for a service
     */
    recordRequest(service: 'dexscreener' | 'pumpfun' | 'helius'): void;
    /**
     * Wait if needed before making a request (with exponential backoff)
     */
    waitIfNeeded(service: 'dexscreener' | 'pumpfun' | 'helius', maxWait?: number): Promise<void>;
    /**
     * Get remaining requests for a service
     */
    getRemainingRequests(service: 'dexscreener' | 'pumpfun' | 'helius'): number;
    /**
     * Get rate limit status for a service
     */
    getStatus(service: 'dexscreener' | 'pumpfun' | 'helius'): {
        canMakeRequest: boolean;
        remaining: number;
        max: number;
        window: number;
        recentRequests: number;
    };
    /**
     * Cleanup old request records
     */
    private cleanup;
    /**
     * Reset rate limit for a service (useful for testing or manual override)
     */
    reset(service: 'dexscreener' | 'pumpfun' | 'helius'): void;
    /**
     * Get all services status
     */
    getAllStatus(): Record<string, {
        canMakeRequest: boolean;
        remaining: number;
        max: number;
        recentRequests: number;
    }>;
}
export declare const rateLimiter: RateLimiter;
export {};
//# sourceMappingURL=rate-limiter.d.ts.map