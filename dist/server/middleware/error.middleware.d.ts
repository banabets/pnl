import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.error';
import { AuthenticatedRequest } from '../auth-middleware';
/**
 * Global error handling middleware
 * Catches all errors and formats them appropriately
 */
export declare function errorHandler(err: Error | AppError, req: Request | AuthenticatedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * 404 Not Found handler
 */
export declare function notFoundHandler(req: Request, res: Response): void;
//# sourceMappingURL=error.middleware.d.ts.map