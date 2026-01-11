import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Define the format for console output (with colors)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? `\n${info.stack}` : ''}`
  ),
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Create transports
const transports: winston.transport[] = [
  // Console transport (always enabled in development)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  }),
];

// Only add file transports in non-test environment
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    // Error log file (only errors)
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format,
      maxFiles: '14d', // Keep logs for 14 days
      maxSize: '20m', // Rotate if file size exceeds 20MB
    }),

    // Combined log file (all levels)
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format,
      maxFiles: '14d',
      maxSize: '20m',
    }),

    // HTTP requests log
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      format,
      maxFiles: '7d',
      maxSize: '20m',
    }),
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  // Don't exit on error
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
export const httpLoggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Wrapper functions for convenience
export const log = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  http: (message: string, meta?: any) => {
    logger.http(message, meta);
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },
};

// Export the logger
export default logger;

// Helper functions for structured logging

/**
 * Log API request
 */
export function logApiRequest(req: any) {
  logger.http(`${req.method} ${req.path}`, {
    ip: req.ip,
    userId: req.user?.userId,
    userAgent: req.get('user-agent'),
  });
}

/**
 * Log API response
 */
export function logApiResponse(req: any, res: any, responseTime: number) {
  const level = res.statusCode >= 400 ? 'warn' : 'http';
  logger.log(level, `${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`, {
    ip: req.ip,
    userId: req.user?.userId,
    statusCode: res.statusCode,
    responseTime,
  });
}

/**
 * Log trading operation
 */
export function logTrade(operation: string, details: any) {
  logger.info(`Trading: ${operation}`, {
    operation,
    ...details,
  });
}

/**
 * Log wallet operation
 */
export function logWallet(operation: string, details: any) {
  logger.info(`Wallet: ${operation}`, {
    operation,
    ...details,
  });
}

/**
 * Log security event
 */
export function logSecurity(event: string, details: any) {
  logger.warn(`Security: ${event}`, {
    event,
    ...details,
  });
}

/**
 * Log database operation
 */
export function logDatabase(operation: string, details: any) {
  logger.debug(`Database: ${operation}`, {
    operation,
    ...details,
  });
}

/**
 * Log external API call
 */
export function logExternalApi(service: string, endpoint: string, details?: any) {
  logger.debug(`External API: ${service} - ${endpoint}`, {
    service,
    endpoint,
    ...details,
  });
}

/**
 * Log alert trigger
 */
export function logAlert(type: string, details: any) {
  logger.info(`Alert: ${type}`, {
    type,
    ...details,
  });
}

/**
 * Log stop-loss execution
 */
export function logStopLoss(operation: string, details: any) {
  logger.info(`Stop-Loss: ${operation}`, {
    operation,
    ...details,
  });
}
