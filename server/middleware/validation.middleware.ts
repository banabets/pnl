import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../errors/app.error';

/**
 * Validate request body against Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details,
          },
        });
      }
      next(error);
    }
  };
}

/**
 * Validate request query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Query validation error',
            code: 'VALIDATION_ERROR',
            details,
          },
        });
      }
      next(error);
    }
  };
}

/**
 * Validate request params
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Parameter validation error',
            code: 'VALIDATION_ERROR',
            details,
          },
        });
      }
      next(error);
    }
  };
}

