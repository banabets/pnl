// Rate Limiter Service - Intelligent rate limiting for external APIs
// Prevents 429 errors by tracking and limiting API requests

import { log } from './logger';

interface RateLimitConfig {
  max: number;        // Maximum requests
  window: number;     // Time window in milliseconds
  name: string;       // Service name for logging
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Configure rate limits for different services (more conservative to avoid 429s)
    this.configs.set('dexscreener', {
      max: 5,            // 5 requests per minute (very conservative to avoid 429s)
      window: 60000,     // per minute
      name: 'DexScreener'
    });

    this.configs.set('pumpfun', {
      max: 5,            // 5 requests
      window: 60000,     // per minute
      name: 'Pump.fun'
    });

    this.configs.set('helius', {
      max: 100,          // 100 requests
      window: 60000,     // per minute (Helius has higher limits)
      name: 'Helius'
    });

    // Cleanup old requests every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request can be made for a service
   */
  canMakeRequest(service: 'dexscreener' | 'pumpfun' | 'helius'): boolean {
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

    const requestTimes = this.requests.get(key)!;
    
    // Remove requests outside the time window
    const recentRequests = requestTimes.filter(time => now - time < config.window);
    this.requests.set(key, recentRequests);

    return recentRequests.length < config.max;
  }

  /**
   * Record a request for a service
   */
  recordRequest(service: 'dexscreener' | 'pumpfun' | 'helius'): void {
    const key = service;
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    this.requests.get(key)!.push(Date.now());
  }

  /**
   * Wait if needed before making a request (with exponential backoff)
   */
  async waitIfNeeded(service: 'dexscreener' | 'pumpfun' | 'helius', maxWait: number = 10000): Promise<void> {
    const config = this.configs.get(service);
    if (!config) {
      return; // No limit configured
    }

    let waitTime = 2000; // Start with 2 seconds (increased to be more conservative)
    let attempts = 0;
    const maxAttempts = 10;

    while (!this.canMakeRequest(service) && attempts < maxAttempts) {
      const waitMs = Math.min(waitTime, maxWait);
      // Only log every 10th attempt to reduce log spam significantly
      if (attempts % 10 === 0 || attempts === 0) {
        log.info(`⏳ Rate limit reached for ${config.name}, waiting ${waitMs}ms... (attempt ${attempts + 1}/${maxAttempts})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitMs));
      
      // Exponential backoff
      waitTime = Math.min(waitTime * 1.5, maxWait);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      log.warn(`⚠️ Max wait attempts reached for ${config.name}, proceeding anyway`);
    }
  }

  /**
   * Get remaining requests for a service
   */
  getRemainingRequests(service: 'dexscreener' | 'pumpfun' | 'helius'): number {
    const config = this.configs.get(service);
    if (!config) {
      return Infinity;
    }

    const now = Date.now();
    const key = service;

    if (!this.requests.has(key)) {
      return config.max;
    }

    const requestTimes = this.requests.get(key)!;
    const recentRequests = requestTimes.filter(time => now - time < config.window);

    return Math.max(0, config.max - recentRequests.length);
  }

  /**
   * Get rate limit status for a service
   */
  getStatus(service: 'dexscreener' | 'pumpfun' | 'helius'): {
    canMakeRequest: boolean;
    remaining: number;
    max: number;
    window: number;
    recentRequests: number;
  } {
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
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, requestTimes] of this.requests) {
      const recent = requestTimes.filter(time => now - time < maxAge);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }

  /**
   * Reset rate limit for a service (useful for testing or manual override)
   */
  reset(service: 'dexscreener' | 'pumpfun' | 'helius'): void {
    this.requests.delete(service);
    log.info(`🔄 Rate limit reset for ${service}`);
  }

  /**
   * Get all services status
   */
  getAllStatus(): Record<string, {
    canMakeRequest: boolean;
    remaining: number;
    max: number;
    recentRequests: number;
  }> {
    const status: Record<string, any> = {};
    
    for (const service of ['dexscreener', 'pumpfun', 'helius'] as const) {
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
export const rateLimiter = new RateLimiter();

