/**
 * Custom Error Classes for PNL Trading Bot
 * Provides structured error handling with proper status codes
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly code?: string;
    constructor(message: string, statusCode?: number, isOperational?: boolean, code?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, field?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class InsufficientBalanceError extends AppError {
    constructor(required: number, available: number);
}
export declare class SlippageExceededError extends AppError {
    constructor(expected: number, actual: number, tolerance: number);
}
export declare class TradingError extends AppError {
    constructor(message: string, details?: any);
}
export declare class DatabaseError extends AppError {
    constructor(message: string, originalError?: Error);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message: string);
}
//# sourceMappingURL=app.error.d.ts.map