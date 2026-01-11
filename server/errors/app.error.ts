/**
 * Custom Error Classes for PNL Trading Bot
 * Provides structured error handling with proper status codes
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, true, 'VALIDATION_ERROR');
    if (field) {
      this.message = `${field}: ${message}`;
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, true, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient balance. Required: ${required} SOL, Available: ${available} SOL`,
      400,
      true,
      'INSUFFICIENT_BALANCE'
    );
  }
}

export class SlippageExceededError extends AppError {
  constructor(expected: number, actual: number, tolerance: number) {
    super(
      `Slippage exceeded. Expected: ${expected}, Actual: ${actual}, Tolerance: ${tolerance}%`,
      400,
      true,
      'SLIPPAGE_EXCEEDED'
    );
  }
}

export class TradingError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'TRADING_ERROR');
    if (details) {
      (this as any).details = details;
    }
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, false, 'DATABASE_ERROR');
    if (originalError) {
      (this as any).originalError = originalError;
    }
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`External service error (${service}): ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR');
  }
}

