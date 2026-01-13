import { z } from 'zod';
export declare const registerSchema: any;
export declare const loginSchema: any;
export declare const tradingExecuteSchema: any;
export declare const tradingStopSchema: any;
export declare const walletCreateSchema: any;
export declare const walletImportSchema: any;
export declare const distributeFromMasterSchema: any;
export declare const recoverToMasterSchema: any;
export declare const emergencyRecoverSchema: any;
export declare const createAlertSchema: any;
export declare const cancelAlertSchema: any;
export declare const createStopLossSchema: any;
export declare const createTrailingStopSchema: any;
/**
 * Validate request body against a Zod schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated data or null if validation fails
 */
export declare function validateRequest<T>(schema: z.ZodSchema<T>, data: any): {
    success: boolean;
    data?: T;
    errors?: z.ZodError;
};
/**
 * Format Zod errors for API response
 * @param errors Zod validation errors
 * @returns Formatted error messages
 */
export declare function formatZodErrors(errors: z.ZodError): Array<{
    field: string;
    message: string;
}>;
/**
 * Express middleware to validate request body
 * @param schema Zod schema to validate against
 */
export declare function validateBody<T>(schema: z.ZodSchema<T>): (req: any, res: any, next: any) => any;
/**
 * Express middleware to validate query parameters
 * @param schema Zod schema to validate against
 */
export declare function validateQuery<T>(schema: z.ZodSchema<T>): (req: any, res: any, next: any) => any;
/**
 * Express middleware to validate route parameters
 * @param schema Zod schema to validate against
 */
export declare function validateParams<T>(schema: z.ZodSchema<T>): (req: any, res: any, next: any) => any;
//# sourceMappingURL=validators.d.ts.map