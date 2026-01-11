import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.error';
import { log } from '../logger';
import { AuthenticatedRequest } from '../auth-middleware';

/**
 * Global error handling middleware
 * Catches all errors and formats them appropriately
 */
export function errorHandler(
  err: Error | AppError,
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Log error
  log.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: (req as AuthenticatedRequest).userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
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
  if ((err as any).errors) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: (err as any).errors,
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
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
}

