import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    password: string;
}, {
    username: string;
    email: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
export declare const tradingExecuteSchema: z.ZodObject<{
    tokenMint: z.ZodString;
    amount: z.ZodNumber;
    slippage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    walletIndex: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    tokenMint: string;
    walletIndex: number;
    slippage: number;
}, {
    amount: number;
    tokenMint: string;
    walletIndex?: number | undefined;
    slippage?: number | undefined;
}>;
export declare const tradingStopSchema: z.ZodObject<{
    botType: z.ZodOptional<z.ZodEnum<["sniper", "dca", "copy-trading"]>>;
}, "strip", z.ZodTypeAny, {
    botType?: "sniper" | "dca" | "copy-trading" | undefined;
}, {
    botType?: "sniper" | "dca" | "copy-trading" | undefined;
}>;
export declare const walletCreateSchema: z.ZodObject<{
    count: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    count: number;
}, {
    count?: number | undefined;
}>;
export declare const walletImportSchema: z.ZodObject<{
    privateKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    privateKey: string;
}, {
    privateKey: string;
}>;
export declare const distributeFromMasterSchema: z.ZodObject<{
    amount: z.ZodNumber;
    distributeTo: z.ZodEnum<["all", "specific"]>;
    walletIndices: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    distributeTo: "all" | "specific";
    walletIndices?: number[] | undefined;
}, {
    amount: number;
    distributeTo: "all" | "specific";
    walletIndices?: number[] | undefined;
}>;
export declare const recoverToMasterSchema: z.ZodObject<{
    fromWallet: z.ZodUnion<[z.ZodLiteral<"all">, z.ZodNumber]>;
    minAmount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    fromWallet: number | "all";
    minAmount: number;
}, {
    fromWallet: number | "all";
    minAmount?: number | undefined;
}>;
export declare const emergencyRecoverSchema: z.ZodObject<{
    privateKey: z.ZodString;
    destinationAddress: z.ZodString;
}, "strip", z.ZodTypeAny, {
    privateKey: string;
    destinationAddress: string;
}, {
    privateKey: string;
    destinationAddress: string;
}>;
export declare const createAlertSchema: z.ZodObject<{
    tokenMint: z.ZodString;
    tokenName: z.ZodString;
    tokenSymbol: z.ZodString;
    alertType: z.ZodEnum<["price-above", "price-below", "volume-above", "market-cap-above"]>;
    targetValue: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    alertType: "price-above" | "price-below" | "volume-above" | "market-cap-above";
    targetValue: number;
}, {
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    alertType: "price-above" | "price-below" | "volume-above" | "market-cap-above";
    targetValue: number;
}>;
export declare const cancelAlertSchema: z.ZodObject<{
    alertId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    alertId: string;
}, {
    alertId: string;
}>;
export declare const createStopLossSchema: z.ZodObject<{
    positionId: z.ZodString;
    tokenMint: z.ZodString;
    tokenName: z.ZodString;
    tokenSymbol: z.ZodString;
    walletIndex: z.ZodNumber;
    walletAddress: z.ZodString;
    triggerPrice: z.ZodNumber;
    amount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    tokenMint: string;
    walletIndex: number;
    tokenName: string;
    triggerPrice: number;
    walletAddress: string;
    tokenSymbol: string;
    positionId: string;
}, {
    tokenMint: string;
    walletIndex: number;
    tokenName: string;
    triggerPrice: number;
    walletAddress: string;
    tokenSymbol: string;
    positionId: string;
    amount?: number | undefined;
}>;
export declare const createTrailingStopSchema: z.ZodObject<{
    positionId: z.ZodString;
    tokenMint: z.ZodString;
    tokenName: z.ZodString;
    tokenSymbol: z.ZodString;
    walletIndex: z.ZodNumber;
    walletAddress: z.ZodString;
    trailingPercent: z.ZodNumber;
    currentPrice: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tokenMint: string;
    walletIndex: number;
    currentPrice: number;
    tokenName: string;
    walletAddress: string;
    tokenSymbol: string;
    positionId: string;
    trailingPercent: number;
}, {
    tokenMint: string;
    walletIndex: number;
    currentPrice: number;
    tokenName: string;
    walletAddress: string;
    tokenSymbol: string;
    positionId: string;
    trailingPercent: number;
}>;
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