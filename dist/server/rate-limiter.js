"use strict";
// Rate Limiter Service - Intelligent rate limiting for external APIs
// Prevents 429 errors by tracking and limiting API requests
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.configs = new Map();
        // Configure rate limits for different services
        this.configs.set('dexscreener', {
            max: 10, // 10 requests
            window: 60000, // per minute
            name: 'DexScreener'
        });
        this.configs.set('pumpfun', {
            max: 5, // 5 requests
            window: 60000, // per minute
            name: 'Pump.fun'
        });
        this.configs.set('helius', {
            max: 100, // 100 requests
            window: 60000, // per minute (Helius has higher limits)
            name: 'Helius'
        });
        // Cleanup old requests every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
    /**
     * Check if a request can be made for a service
     */
    canMakeRequest(service) {
        const config = this.configs.get(service);
        if (!config) {
            return true; // No limit configured, allow request
        }
        const now = Date.now();
        const key = service;
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
            return true;
        }
        const requestTimes = this.requests.get(key);
        // Remove requests outside the time window
        const recentRequests = requestTimes.filter(time => now - time < config.window);
        this.requests.set(key, recentRequests);
        return recentRequests.length < config.max;
    }
    /**
     * Record a request for a service
     */
    recordRequest(service) {
        const key = service;
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        this.requests.get(key).push(Date.now());
    }
    /**
     * Wait if needed before making a request (with exponential backoff)
     */
    async waitIfNeeded(service, maxWait = 10000) {
        const config = this.configs.get(service);
        if (!config) {
            return; // No limit configured
        }
        let waitTime = 1000; // Start with 1 second
        let attempts = 0;
        const maxAttempts = 10;
        while (!this.canMakeRequest(service) && attempts < maxAttempts) {
            const waitMs = Math.min(waitTime, maxWait);
            console.log(`⏳ Rate limit reached for ${config.name}, waiting ${waitMs}ms... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            // Exponential backoff
            waitTime = Math.min(waitTime * 1.5, maxWait);
            attempts++;
        }
        if (attempts >= maxAttempts) {
            console.warn(`⚠️ Max wait attempts reached for ${config.name}, proceeding anyway`);
        }
    }
    /**
     * Get remaining requests for a service
     */
    getRemainingRequests(service) {
        const config = this.configs.get(service);
        if (!config) {
            return Infinity;
        }
        const now = Date.now();
        const key = service;
        if (!this.requests.has(key)) {
            return config.max;
        }
        const requestTimes = this.requests.get(key);
        const recentRequests = requestTimes.filter(time => now - time < config.window);
        return Math.max(0, config.max - recentRequests.length);
    }
    /**
     * Get rate limit status for a service
     */
    getStatus(service) {
        const config = this.configs.get(service);
        if (!config) {
            return {
                canMakeRequest: true,
                remaining: Infinity,
                max: Infinity,
                window: 0,
                recentRequests: 0
            };
        }
        const now = Date.now();
        const key = service;
        const requestTimes = this.requests.get(key) || [];
        const recentRequests = requestTimes.filter(time => now - time < config.window);
        const remaining = Math.max(0, config.max - recentRequests.length);
        return {
            canMakeRequest: recentRequests.length < config.max,
            remaining,
            max: config.max,
            window: config.window,
            recentRequests: recentRequests.length
        };
    }
    /**
     * Cleanup old request records
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        for (const [key, requestTimes] of this.requests) {
            const recent = requestTimes.filter(time => now - time < maxAge);
            if (recent.length === 0) {
                this.requests.delete(key);
            }
            else {
                this.requests.set(key, recent);
            }
        }
    }
    /**
     * Reset rate limit for a service (useful for testing or manual override)
     */
    reset(service) {
        this.requests.delete(service);
        console.log(`🔄 Rate limit reset for ${service}`);
    }
    /**
     * Get all services status
     */
    getAllStatus() {
        const status = {};
        for (const service of ['dexscreener', 'pumpfun', 'helius']) {
            const serviceStatus = this.getStatus(service);
            status[service] = {
                canMakeRequest: serviceStatus.canMakeRequest,
                remaining: serviceStatus.remaining,
                max: serviceStatus.max,
                recentRequests: serviceStatus.recentRequests
            };
        }
        return status;
    }
}
// Singleton instance
exports.rateLimiter = new RateLimiter();
//# sourceMappingURL=rate-limiter.js.map