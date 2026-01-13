import { Request, Response } from 'express';

/**
 * Simple in-memory metrics collector
 * For production, consider using Prometheus client
 */

interface Metric {
  count: number;
  lastUpdated: number;
}

interface TimedMetric {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  lastUpdated: number;
}

class MetricsCollector {
  private counters: Map<string, Metric> = new Map();
  private timers: Map<string, TimedMetric> = new Map();
  private gauges: Map<string, number> = new Map();

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1) {
    const existing = this.counters.get(name);

    if (existing) {
      existing.count += value;
      existing.lastUpdated = Date.now();
    } else {
      this.counters.set(name, {
        count: value,
        lastUpdated: Date.now(),
      });
    }
  }

  /**
   * Record a timing metric
   */
  recordTiming(name: string, timeMs: number) {
    const existing = this.timers.get(name);

    if (existing) {
      existing.count++;
      existing.totalTime += timeMs;
      existing.minTime = Math.min(existing.minTime, timeMs);
      existing.maxTime = Math.max(existing.maxTime, timeMs);
      existing.avgTime = existing.totalTime / existing.count;
      existing.lastUpdated = Date.now();
    } else {
      this.timers.set(name, {
        count: 1,
        totalTime: timeMs,
        minTime: timeMs,
        maxTime: timeMs,
        avgTime: timeMs,
        lastUpdated: Date.now(),
      });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number) {
    this.gauges.set(name, value);
  }

  /**
   * Get a counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name)?.count || 0;
  }

  /**
   * Get a timer metric
   */
  getTimer(name: string): TimedMetric | null {
    return this.timers.get(name) || null;
  }

  /**
   * Get a gauge value
   */
  getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      timers: Object.fromEntries(this.timers),
      gauges: Object.fromEntries(this.gauges),
    };
  }

  /**
   * Reset a specific metric
   */
  reset(name: string) {
    this.counters.delete(name);
    this.timers.delete(name);
    this.gauges.delete(name);
  }

  /**
   * Reset all metrics
   */
  resetAll() {
    this.counters.clear();
    this.timers.clear();
    this.gauges.clear();
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

/**
 * Middleware to track API requests
 */
export function metricsMiddleware(req: Request, res: Response, next: any) {
  const startTime = Date.now();

  // Track request
  metrics.incrementCounter('http_requests_total');
  metrics.incrementCounter(`http_requests_${req.method.toLowerCase()}`);

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    metrics.recordTiming('http_request_duration_ms', duration);
    metrics.recordTiming(`http_request_duration_${req.method.toLowerCase()}_ms`, duration);

    // Track status codes
    metrics.incrementCounter(`http_responses_${res.statusCode}`);

    if (res.statusCode >= 500) {
      metrics.incrementCounter('http_errors_5xx');
    } else if (res.statusCode >= 400) {
      metrics.incrementCounter('http_errors_4xx');
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      metrics.incrementCounter('http_success_2xx');
    }
  });

  next();
}

/**
 * Metrics endpoint handler
 */
export function metricsHandler(req: Request, res: Response) {
  const allMetrics = metrics.getAllMetrics();

  // Add system metrics
  const memUsage = process.memoryUsage();
  const systemMetrics = {
    uptime_seconds: process.uptime(),
    memory_heap_used_bytes: memUsage.heapUsed,
    memory_heap_total_bytes: memUsage.heapTotal,
    memory_rss_bytes: memUsage.rss,
    memory_external_bytes: memUsage.external,
    process_cpu_user_seconds: process.cpuUsage().user / 1000000,
    process_cpu_system_seconds: process.cpuUsage().system / 1000000,
  };

  res.json({
    timestamp: new Date().toISOString(),
    metrics: allMetrics,
    system: systemMetrics,
  });
}

/**
 * Helper functions for business metrics
 */

export const businessMetrics = {
  /**
   * Track a trade
   */
  recordTrade(type: 'buy' | 'sell', tokenMint: string, amountSol: number) {
    metrics.incrementCounter('trades_total');
    metrics.incrementCounter(`trades_${type}`);
    metrics.incrementCounter(`trades_by_token_${tokenMint}`);

    // Track volume
    const currentVolume = metrics.getGauge('trading_volume_sol') || 0;
    metrics.setGauge('trading_volume_sol', currentVolume + amountSol);
  },

  /**
   * Track an alert
   */
  recordAlert(type: string, triggered: boolean) {
    metrics.incrementCounter('alerts_created_total');
    metrics.incrementCounter(`alerts_${type}`);

    if (triggered) {
      metrics.incrementCounter('alerts_triggered_total');
      metrics.incrementCounter(`alerts_triggered_${type}`);
    }
  },

  /**
   * Track stop-loss execution
   */
  recordStopLoss(type: 'stop-loss' | 'take-profit' | 'trailing-stop', executed: boolean) {
    metrics.incrementCounter('stop_loss_created_total');
    metrics.incrementCounter(`stop_loss_${type}`);

    if (executed) {
      metrics.incrementCounter('stop_loss_executed_total');
      metrics.incrementCounter(`stop_loss_executed_${type}`);
    }
  },

  /**
   * Track wallet operations
   */
  recordWalletOperation(operation: 'create' | 'import' | 'fund' | 'recover') {
    metrics.incrementCounter('wallet_operations_total');
    metrics.incrementCounter(`wallet_${operation}`);
  },

  /**
   * Track authentication
   */
  recordAuth(type: 'register' | 'login' | 'logout', success: boolean) {
    metrics.incrementCounter('auth_attempts_total');
    metrics.incrementCounter(`auth_${type}`);

    if (success) {
      metrics.incrementCounter('auth_success_total');
      metrics.incrementCounter(`auth_success_${type}`);
    } else {
      metrics.incrementCounter('auth_failure_total');
      metrics.incrementCounter(`auth_failure_${type}`);
    }
  },

  /**
   * Track active users (gauge)
   */
  setActiveUsers(count: number) {
    metrics.setGauge('active_users', count);
  },

  /**
   * Track active WebSocket connections (gauge)
   */
  setActiveConnections(count: number) {
    metrics.setGauge('websocket_connections', count);
  },
};

export default metrics;
