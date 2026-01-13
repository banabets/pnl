"use strict";
/**
 * Prometheus Metrics
 * Advanced metrics collection for monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalPositions = exports.totalWallets = exports.activeUsers = exports.errorsTotal = exports.cacheMisses = exports.cacheHits = exports.databaseQueryDuration = exports.databaseQueries = exports.websocketMessages = exports.websocketConnections = exports.httpRequestTotal = exports.httpRequestDuration = exports.tradeAmount = exports.tradeDuration = exports.tradesCounter = exports.register = void 0;
exports.getMetricsHandler = getMetricsHandler;
const prom_client_1 = __importDefault(require("prom-client"));
const logger_1 = require("../logger");
// Create a Registry to register the metrics
exports.register = new prom_client_1.default.Registry();
// Add default metrics (CPU, memory, etc.)
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
// Custom metrics
// Trading metrics
exports.tradesCounter = new prom_client_1.default.Counter({
    name: 'trades_total',
    help: 'Total number of trades executed',
    labelNames: ['type', 'status', 'token_mint'],
    registers: [exports.register],
});
exports.tradeDuration = new prom_client_1.default.Histogram({
    name: 'trade_duration_seconds',
    help: 'Trade execution duration in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    labelNames: ['type'],
    registers: [exports.register],
});
exports.tradeAmount = new prom_client_1.default.Histogram({
    name: 'trade_amount_sol',
    help: 'Trade amount in SOL',
    buckets: [0.01, 0.1, 0.5, 1, 5, 10, 50, 100],
    labelNames: ['type'],
    registers: [exports.register],
});
// API metrics
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [exports.register],
});
exports.httpRequestTotal = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.register],
});
// WebSocket metrics
exports.websocketConnections = new prom_client_1.default.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
    registers: [exports.register],
});
exports.websocketMessages = new prom_client_1.default.Counter({
    name: 'websocket_messages_total',
    help: 'Total number of WebSocket messages',
    labelNames: ['type'],
    registers: [exports.register],
});
// Database metrics
exports.databaseQueries = new prom_client_1.default.Counter({
    name: 'database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['collection', 'operation'],
    registers: [exports.register],
});
exports.databaseQueryDuration = new prom_client_1.default.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['collection', 'operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    registers: [exports.register],
});
// Cache metrics
exports.cacheHits = new prom_client_1.default.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
    registers: [exports.register],
});
exports.cacheMisses = new prom_client_1.default.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
    registers: [exports.register],
});
// Error metrics
exports.errorsTotal = new prom_client_1.default.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity'],
    registers: [exports.register],
});
// Business metrics
exports.activeUsers = new prom_client_1.default.Gauge({
    name: 'active_users_total',
    help: 'Number of active users',
    registers: [exports.register],
});
exports.totalWallets = new prom_client_1.default.Gauge({
    name: 'wallets_total',
    help: 'Total number of wallets',
    registers: [exports.register],
});
exports.totalPositions = new prom_client_1.default.Gauge({
    name: 'positions_total',
    help: 'Total number of open positions',
    registers: [exports.register],
});
/**
 * Get metrics endpoint handler
 */
function getMetricsHandler() {
    return async (req, res) => {
        try {
            res.set('Content-Type', exports.register.contentType);
            const metrics = await exports.register.metrics();
            res.end(metrics);
        }
        catch (error) {
            logger_1.log.error('Error generating metrics', { error: error.message });
            res.status(500).end();
        }
    };
}
logger_1.log.info('Prometheus metrics initialized');
//# sourceMappingURL=prometheus.metrics.js.map