"use strict";
/**
 * Custom Error Classes for PNL Trading Bot
 * Provides structured error handling with proper status codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServiceError = exports.DatabaseError = exports.TradingError = exports.SlippageExceededError = exports.InsufficientBalanceError = exports.RateLimitError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.name = this.constructor.name;
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, field) {
        super(message, 400, true, 'VALIDATION_ERROR');
        if (field) {
            this.message = `${field}: ${message}`;
        }
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        const message = id
            ? `${resource} with id '${id}' not found`
            : `${resource} not found`;
        super(message, 404, true, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, true, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, true, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, true, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
    }
}
exports.RateLimitError = RateLimitError;
class InsufficientBalanceError extends AppError {
    constructor(required, available) {
        super(`Insufficient balance. Required: ${required} SOL, Available: ${available} SOL`, 400, true, 'INSUFFICIENT_BALANCE');
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
class SlippageExceededError extends AppError {
    constructor(expected, actual, tolerance) {
        super(`Slippage exceeded. Expected: ${expected}, Actual: ${actual}, Tolerance: ${tolerance}%`, 400, true, 'SLIPPAGE_EXCEEDED');
    }
}
exports.SlippageExceededError = SlippageExceededError;
class TradingError extends AppError {
    constructor(message, details) {
        super(message, 400, true, 'TRADING_ERROR');
        if (details) {
            this.details = details;
        }
    }
}
exports.TradingError = TradingError;
class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(message, 500, false, 'DATABASE_ERROR');
        if (originalError) {
            this.originalError = originalError;
        }
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    constructor(service, message) {
        super(`External service error (${service}): ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR');
    }
}
exports.ExternalServiceError = ExternalServiceError;
//# sourceMappingURL=app.error.js.map