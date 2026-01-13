/**
 * Prometheus Metrics
 * Advanced metrics collection for monitoring
 */
import client from 'prom-client';
export declare const register: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const tradesCounter: client.Counter<"type" | "status" | "token_mint">;
export declare const tradeDuration: client.Histogram<"type">;
export declare const tradeAmount: client.Histogram<"type">;
export declare const httpRequestDuration: client.Histogram<"route" | "method" | "status_code">;
export declare const httpRequestTotal: client.Counter<"route" | "method" | "status_code">;
export declare const websocketConnections: client.Gauge<string>;
export declare const websocketMessages: client.Counter<"type">;
export declare const databaseQueries: client.Counter<"collection" | "operation">;
export declare const databaseQueryDuration: client.Histogram<"collection" | "operation">;
export declare const cacheHits: client.Counter<"cache_type">;
export declare const cacheMisses: client.Counter<"cache_type">;
export declare const errorsTotal: client.Counter<"type" | "severity">;
export declare const activeUsers: client.Gauge<string>;
export declare const totalWallets: client.Gauge<string>;
export declare const totalPositions: client.Gauge<string>;
/**
 * Get metrics endpoint handler
 */
export declare function getMetricsHandler(): (req: any, res: any) => Promise<void>;
//# sourceMappingURL=prometheus.metrics.d.ts.map