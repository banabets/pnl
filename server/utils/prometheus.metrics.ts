/**
 * Prometheus Metrics
 * Advanced metrics collection for monitoring
 */

import client from 'prom-client';
import { log } from '../logger';

// Create a Registry to register the metrics
export const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics

// Trading metrics
export const tradesCounter = new client.Counter({
  name: 'trades_total',
  help: 'Total number of trades executed',
  labelNames: ['type', 'status', 'token_mint'],
  registers: [register],
});

export const tradeDuration = new client.Histogram({
  name: 'trade_duration_seconds',
  help: 'Trade execution duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  labelNames: ['type'],
  registers: [register],
});

export const tradeAmount = new client.Histogram({
  name: 'trade_amount_sol',
  help: 'Trade amount in SOL',
  buckets: [0.01, 0.1, 0.5, 1, 5, 10, 50, 100],
  labelNames: ['type'],
  registers: [register],
});

// API metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// WebSocket metrics
export const websocketConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const websocketMessages = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['type'],
  registers: [register],
});

// Database metrics
export const databaseQueries = new client.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['collection', 'operation'],
  registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['collection', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Cache metrics
export const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// Error metrics
export const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
  registers: [register],
});

// Business metrics
export const activeUsers = new client.Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
  registers: [register],
});

export const totalWallets = new client.Gauge({
  name: 'wallets_total',
  help: 'Total number of wallets',
  registers: [register],
});

export const totalPositions = new client.Gauge({
  name: 'positions_total',
  help: 'Total number of open positions',
  registers: [register],
});

/**
 * Get metrics endpoint handler
 */
export function getMetricsHandler() {
  return async (req: any, res: any) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      log.error('Error generating metrics', { error: (error as Error).message });
      res.status(500).end();
    }
  };
}

log.info('Prometheus metrics initialized');

