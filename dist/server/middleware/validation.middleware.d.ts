import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * Validate request body against Zod schema
 */
export declare function validateBody<T>(schema: ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => any;
/**
 * Validate request query parameters
 */
export declare function validateQuery<T>(schema: ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => any;
/**
 * Validate request params
 */
export declare function validateParams<T>(schema: ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => any;
//# sourceMappingURL=validation.middleware.d.ts.map