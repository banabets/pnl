// DexScreener Request Queue - Serializes all DexScreener API requests
// Prevents concurrent requests that cause rate limit issues

import { rateLimiter } from './rate-limiter';
import { log } from './logger';

type DexScreenerRequest<T> = () => Promise<T>;

interface QueuedRequest<T> {
  request: DexScreenerRequest<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class DexScreenerQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing: boolean = false;
  private minDelayBetweenRequests: number = 12000; // 12 seconds between requests (5 req/min = 12s each)
  private lastRequestTime: number = 0;

  /**
   * Add a request to the queue
   */
  async enqueue<T>(request: DexScreenerRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the queue (one request at a time)
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        // Check rate limit before processing
        if (!rateLimiter.canMakeRequest('dexscreener')) {
          // Wait if rate limit is reached
          await rateLimiter.waitIfNeeded('dexscreener', 30000); // Max 30s wait
        }

        // Ensure minimum delay between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.minDelayBetweenRequests) {
          const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Record request before making it
        rateLimiter.recordRequest('dexscreener');
        this.lastRequestTime = Date.now();

        // Execute the request
        const result = await item.request();
        item.resolve(result);

        // Small delay after successful request
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        log.error('DexScreener queue request failed', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    processing: boolean;
    lastRequestTime: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Clear the queue (useful for testing or emergency)
   */
  clear(): void {
    this.queue = [];
    log.info('DexScreener queue cleared');
  }
}

// Singleton instance
export const dexscreenerQueue = new DexScreenerQueue();
