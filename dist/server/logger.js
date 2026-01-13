"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.httpLoggerStream = void 0;
exports.logApiRequest = logApiRequest;
exports.logApiResponse = logApiResponse;
exports.logTrade = logTrade;
exports.logWallet = logWallet;
exports.logSecurity = logSecurity;
exports.logDatabase = logDatabase;
exports.logExternalApi = logExternalApi;
exports.logAlert = logAlert;
exports.logStopLoss = logStopLoss;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
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
winston_1.default.addColors(colors);
// Define which transports the logger must use
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
// Define the format for console output (with colors)
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize({ all: true }), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? `\n${info.stack}` : ''}`));
// Create logs directory if it doesn't exist
const logsDir = path_1.default.join(process.cwd(), 'logs');
// Create transports
const transports = [
    // Console transport (always enabled in development)
    new winston_1.default.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    }),
];
// Only add file transports in non-test environment
if (process.env.NODE_ENV !== 'test') {
    transports.push(
    // Error log file (only errors)
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format,
        maxFiles: '14d', // Keep logs for 14 days
        maxSize: '20m', // Rotate if file size exceeds 20MB
    }), 
    // Combined log file (all levels)
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format,
        maxFiles: '14d',
        maxSize: '20m',
    }), 
    // HTTP requests log
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logsDir, 'http-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        format,
        maxFiles: '7d',
        maxSize: '20m',
    }));
}
// Create the logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    levels,
    format,
    transports,
    // Don't exit on error
    exitOnError: false,
});
// Create a stream object for Morgan HTTP logger
exports.httpLoggerStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};
// Wrapper functions for convenience
exports.log = {
    error: (message, meta) => {
        logger.error(message, meta);
    },
    warn: (message, meta) => {
        logger.warn(message, meta);
    },
    info: (message, meta) => {
        logger.info(message, meta);
    },
    http: (message, meta) => {
        logger.http(message, meta);
    },
    debug: (message, meta) => {
        logger.debug(message, meta);
    },
};
// Export the logger
exports.default = logger;
// Helper functions for structured logging
/**
 * Log API request
 */
function logApiRequest(req) {
    logger.http(`${req.method} ${req.path}`, {
        ip: req.ip,
        userId: req.user?.userId,
        userAgent: req.get('user-agent'),
    });
}
/**
 * Log API response
 */
function logApiResponse(req, res, responseTime) {
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
function logTrade(operation, details) {
    logger.info(`Trading: ${operation}`, {
        operation,
        ...details,
    });
}
/**
 * Log wallet operation
 */
function logWallet(operation, details) {
    logger.info(`Wallet: ${operation}`, {
        operation,
        ...details,
    });
}
/**
 * Log security event
 */
function logSecurity(event, details) {
    logger.warn(`Security: ${event}`, {
        event,
        ...details,
    });
}
/**
 * Log database operation
 */
function logDatabase(operation, details) {
    logger.debug(`Database: ${operation}`, {
        operation,
        ...details,
    });
}
/**
 * Log external API call
 */
function logExternalApi(service, endpoint, details) {
    logger.debug(`External API: ${service} - ${endpoint}`, {
        service,
        endpoint,
        ...details,
    });
}
/**
 * Log alert trigger
 */
function logAlert(type, details) {
    logger.info(`Alert: ${type}`, {
        type,
        ...details,
    });
}
/**
 * Log stop-loss execution
 */
function logStopLoss(operation, details) {
    logger.info(`Stop-Loss: ${operation}`, {
        operation,
        ...details,
    });
}
//# sourceMappingURL=logger.js.map