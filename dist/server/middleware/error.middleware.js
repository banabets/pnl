"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.notFoundHandler = notFoundHandler;
const app_error_1 = require("../errors/app.error");
const logger_1 = require("../logger");
/**
 * Global error handling middleware
 * Catches all errors and formats them appropriately
 */
function errorHandler(err, req, res, next) {
    // Log error
    logger_1.log.error('Error occurred', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    // Handle AppError (operational errors)
    if (err instanceof app_error_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.code,
                statusCode: err.statusCode,
            },
        });
    }
    // Handle validation errors from express-validator
    if (err.errors) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: err.errors,
            },
        });
    }
    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
        success: false,
        error: {
            message: isDevelopment ? err.message : 'Internal server error',
            code: 'INTERNAL_ERROR',
            ...(isDevelopment && { stack: err.stack }),
        },
    });
}
/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.method} ${req.path} not found`,
            code: 'NOT_FOUND',
        },
    });
}
//# sourceMappingURL=error.middleware.js.map