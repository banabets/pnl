"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessMetrics = exports.metrics = void 0;
exports.metricsMiddleware = metricsMiddleware;
exports.metricsHandler = metricsHandler;
class MetricsCollector {
    constructor() {
        this.counters = new Map();
        this.timers = new Map();
        this.gauges = new Map();
    }
    /**
     * Increment a counter
     */
    incrementCounter(name, value = 1) {
        const existing = this.counters.get(name);
        if (existing) {
            existing.count += value;
            existing.lastUpdated = Date.now();
        }
        else {
            this.counters.set(name, {
                count: value,
                lastUpdated: Date.now(),
            });
        }
    }
    /**
     * Record a timing metric
     */
    recordTiming(name, timeMs) {
        const existing = this.timers.get(name);
        if (existing) {
            existing.count++;
            existing.totalTime += timeMs;
            existing.minTime = Math.min(existing.minTime, timeMs);
            existing.maxTime = Math.max(existing.maxTime, timeMs);
            existing.avgTime = existing.totalTime / existing.count;
            existing.lastUpdated = Date.now();
        }
        else {
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
    setGauge(name, value) {
        this.gauges.set(name, value);
    }
    /**
     * Get a counter value
     */
    getCounter(name) {
        return this.counters.get(name)?.count || 0;
    }
    /**
     * Get a timer metric
     */
    getTimer(name) {
        return this.timers.get(name) || null;
    }
    /**
     * Get a gauge value
     */
    getGauge(name) {
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
    reset(name) {
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
exports.metrics = new MetricsCollector();
/**
 * Middleware to track API requests
 */
function metricsMiddleware(req, res, next) {
    const startTime = Date.now();
    // Track request
    exports.metrics.incrementCounter('http_requests_total');
    exports.metrics.incrementCounter(`http_requests_${req.method.toLowerCase()}`);
    // Track response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        exports.metrics.recordTiming('http_request_duration_ms', duration);
        exports.metrics.recordTiming(`http_request_duration_${req.method.toLowerCase()}_ms`, duration);
        // Track status codes
        exports.metrics.incrementCounter(`http_responses_${res.statusCode}`);
        if (res.statusCode >= 500) {
            exports.metrics.incrementCounter('http_errors_5xx');
        }
        else if (res.statusCode >= 400) {
            exports.metrics.incrementCounter('http_errors_4xx');
        }
        else if (res.statusCode >= 200 && res.statusCode < 300) {
            exports.metrics.incrementCounter('http_success_2xx');
        }
    });
    next();
}
/**
 * Metrics endpoint handler
 */
function metricsHandler(req, res) {
    const allMetrics = exports.metrics.getAllMetrics();
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
exports.businessMetrics = {
    /**
     * Track a trade
     */
    recordTrade(type, tokenMint, amountSol) {
        exports.metrics.incrementCounter('trades_total');
        exports.metrics.incrementCounter(`trades_${type}`);
        exports.metrics.incrementCounter(`trades_by_token_${tokenMint}`);
        // Track volume
        const currentVolume = exports.metrics.getGauge('trading_volume_sol') || 0;
        exports.metrics.setGauge('trading_volume_sol', currentVolume + amountSol);
    },
    /**
     * Track an alert
     */
    recordAlert(type, triggered) {
        exports.metrics.incrementCounter('alerts_created_total');
        exports.metrics.incrementCounter(`alerts_${type}`);
        if (triggered) {
            exports.metrics.incrementCounter('alerts_triggered_total');
            exports.metrics.incrementCounter(`alerts_triggered_${type}`);
        }
    },
    /**
     * Track stop-loss execution
     */
    recordStopLoss(type, executed) {
        exports.metrics.incrementCounter('stop_loss_created_total');
        exports.metrics.incrementCounter(`stop_loss_${type}`);
        if (executed) {
            exports.metrics.incrementCounter('stop_loss_executed_total');
            exports.metrics.incrementCounter(`stop_loss_executed_${type}`);
        }
    },
    /**
     * Track wallet operations
     */
    recordWalletOperation(operation) {
        exports.metrics.incrementCounter('wallet_operations_total');
        exports.metrics.incrementCounter(`wallet_${operation}`);
    },
    /**
     * Track authentication
     */
    recordAuth(type, success) {
        exports.metrics.incrementCounter('auth_attempts_total');
        exports.metrics.incrementCounter(`auth_${type}`);
        if (success) {
            exports.metrics.incrementCounter('auth_success_total');
            exports.metrics.incrementCounter(`auth_success_${type}`);
        }
        else {
            exports.metrics.incrementCounter('auth_failure_total');
            exports.metrics.incrementCounter(`auth_failure_${type}`);
        }
    },
    /**
     * Track active users (gauge)
     */
    setActiveUsers(count) {
        exports.metrics.setGauge('active_users', count);
    },
    /**
     * Track active WebSocket connections (gauge)
     */
    setActiveConnections(count) {
        exports.metrics.setGauge('websocket_connections', count);
    },
};
exports.default = exports.metrics;
//# sourceMappingURL=metrics.js.map