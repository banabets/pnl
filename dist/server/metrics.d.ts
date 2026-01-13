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
declare class MetricsCollector {
    private counters;
    private timers;
    private gauges;
    /**
     * Increment a counter
     */
    incrementCounter(name: string, value?: number): void;
    /**
     * Record a timing metric
     */
    recordTiming(name: string, timeMs: number): void;
    /**
     * Set a gauge value
     */
    setGauge(name: string, value: number): void;
    /**
     * Get a counter value
     */
    getCounter(name: string): number;
    /**
     * Get a timer metric
     */
    getTimer(name: string): TimedMetric | null;
    /**
     * Get a gauge value
     */
    getGauge(name: string): number;
    /**
     * Get all metrics
     */
    getAllMetrics(): {
        counters: {
            [k: string]: Metric;
        };
        timers: {
            [k: string]: TimedMetric;
        };
        gauges: {
            [k: string]: number;
        };
    };
    /**
     * Reset a specific metric
     */
    reset(name: string): void;
    /**
     * Reset all metrics
     */
    resetAll(): void;
}
export declare const metrics: MetricsCollector;
/**
 * Middleware to track API requests
 */
export declare function metricsMiddleware(req: Request, res: Response, next: any): void;
/**
 * Metrics endpoint handler
 */
export declare function metricsHandler(req: Request, res: Response): void;
/**
 * Helper functions for business metrics
 */
export declare const businessMetrics: {
    /**
     * Track a trade
     */
    recordTrade(type: "buy" | "sell", tokenMint: string, amountSol: number): void;
    /**
     * Track an alert
     */
    recordAlert(type: string, triggered: boolean): void;
    /**
     * Track stop-loss execution
     */
    recordStopLoss(type: "stop-loss" | "take-profit" | "trailing-stop", executed: boolean): void;
    /**
     * Track wallet operations
     */
    recordWalletOperation(operation: "create" | "import" | "fund" | "recover"): void;
    /**
     * Track authentication
     */
    recordAuth(type: "register" | "login" | "logout", success: boolean): void;
    /**
     * Track active users (gauge)
     */
    setActiveUsers(count: number): void;
    /**
     * Track active WebSocket connections (gauge)
     */
    setActiveConnections(count: number): void;
};
export default metrics;
//# sourceMappingURL=metrics.d.ts.map