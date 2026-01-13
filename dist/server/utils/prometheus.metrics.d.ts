/**
 * Prometheus Metrics
 * Advanced metrics collection for monitoring
 */
export declare const register: any;
export declare const tradesCounter: any;
export declare const tradeDuration: any;
export declare const tradeAmount: any;
export declare const httpRequestDuration: any;
export declare const httpRequestTotal: any;
export declare const websocketConnections: any;
export declare const websocketMessages: any;
export declare const databaseQueries: any;
export declare const databaseQueryDuration: any;
export declare const cacheHits: any;
export declare const cacheMisses: any;
export declare const errorsTotal: any;
export declare const activeUsers: any;
export declare const totalWallets: any;
export declare const totalPositions: any;
/**
 * Get metrics endpoint handler
 */
export declare function getMetricsHandler(): (req: any, res: any) => Promise<void>;
//# sourceMappingURL=prometheus.metrics.d.ts.map