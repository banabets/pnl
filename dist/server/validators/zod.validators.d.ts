/**
 * Zod Validators
 * Centralized validation schemas using Zod
 */
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
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const tradingExecuteSchema: z.ZodObject<{
    tokenMint: z.ZodString;
    amount: z.ZodNumber;
    slippage: z.ZodDefault<z.ZodNumber>;
    walletIndex: z.ZodOptional<z.ZodNumber>;
    type: z.ZodEnum<["buy", "sell"]>;
}, "strip", z.ZodTypeAny, {
    type: "buy" | "sell";
    amount: number;
    tokenMint: string;
    slippage: number;
    walletIndex?: number | undefined;
}, {
    type: "buy" | "sell";
    amount: number;
    tokenMint: string;
    walletIndex?: number | undefined;
    slippage?: number | undefined;
}>;
export declare const createStopLossSchema: z.ZodObject<{
    tokenMint: z.ZodString;
    walletIndex: z.ZodNumber;
    stopPrice: z.ZodNumber;
    amount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tokenMint: string;
    walletIndex: number;
    stopPrice: number;
    amount?: number | undefined;
}, {
    tokenMint: string;
    walletIndex: number;
    stopPrice: number;
    amount?: number | undefined;
}>;
export declare const createTakeProfitSchema: z.ZodObject<{
    tokenMint: z.ZodString;
    walletIndex: z.ZodNumber;
    targetPrice: z.ZodNumber;
    amount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tokenMint: string;
    walletIndex: number;
    targetPrice: number;
    amount?: number | undefined;
}, {
    tokenMint: string;
    walletIndex: number;
    targetPrice: number;
    amount?: number | undefined;
}>;
export declare const generateWalletsSchema: z.ZodObject<{
    count: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    count: number;
}, {
    count?: number | undefined;
}>;
export declare const distributeFromMasterSchema: z.ZodObject<{
    walletIndices: z.ZodArray<z.ZodNumber, "many">;
    amountPerWallet: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    walletIndices: number[];
    amountPerWallet: number;
}, {
    walletIndices: number[];
    amountPerWallet: number;
}>;
export declare const recoverToMasterSchema: z.ZodObject<{
    walletIndices: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    recoverAll: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    recoverAll: boolean;
    walletIndices?: number[] | undefined;
}, {
    walletIndices?: number[] | undefined;
    recoverAll?: boolean | undefined;
}>;
export declare const emergencyRecoverSchema: z.ZodObject<{
    privateKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    privateKey: string;
}, {
    privateKey: string;
}>;
export declare const tokenFeedQuerySchema: z.ZodObject<{
    filter: z.ZodDefault<z.ZodEnum<["all", "new", "graduating", "trending"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    minLiquidity: z.ZodOptional<z.ZodNumber>;
    maxAge: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    filter: "all" | "new" | "graduating" | "trending";
    limit: number;
    maxAge: number;
    minLiquidity?: number | undefined;
}, {
    filter?: "all" | "new" | "graduating" | "trending" | undefined;
    limit?: number | undefined;
    minLiquidity?: number | undefined;
    maxAge?: number | undefined;
}>;
export declare const tokenMintParamSchema: z.ZodObject<{
    mint: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mint: string;
}, {
    mint: string;
}>;
export declare const createAlertSchema: z.ZodObject<{
    tokenMint: z.ZodString;
    type: z.ZodEnum<["price", "volume", "market_cap"]>;
    condition: z.ZodEnum<["above", "below"]>;
    value: z.ZodNumber;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "price" | "volume" | "market_cap";
    value: number;
    tokenMint: string;
    condition: "above" | "below";
    enabled: boolean;
}, {
    type: "price" | "volume" | "market_cap";
    value: number;
    tokenMint: string;
    condition: "above" | "below";
    enabled?: boolean | undefined;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    email?: string | undefined;
    bio?: string | undefined;
}, {
    username?: string | undefined;
    email?: string | undefined;
    bio?: string | undefined;
}>;
export declare const updateSettingsSchema: z.ZodObject<{
    notifications: z.ZodOptional<z.ZodObject<{
        email: z.ZodOptional<z.ZodBoolean>;
        push: z.ZodOptional<z.ZodBoolean>;
        trades: z.ZodOptional<z.ZodBoolean>;
        alerts: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        push?: boolean | undefined;
        email?: boolean | undefined;
        trades?: boolean | undefined;
        alerts?: boolean | undefined;
    }, {
        push?: boolean | undefined;
        email?: boolean | undefined;
        trades?: boolean | undefined;
        alerts?: boolean | undefined;
    }>>;
    trading: z.ZodOptional<z.ZodObject<{
        defaultSlippage: z.ZodOptional<z.ZodNumber>;
        defaultAmount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        defaultSlippage?: number | undefined;
        defaultAmount?: number | undefined;
    }, {
        defaultSlippage?: number | undefined;
        defaultAmount?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    notifications?: {
        push?: boolean | undefined;
        email?: boolean | undefined;
        trades?: boolean | undefined;
        alerts?: boolean | undefined;
    } | undefined;
    trading?: {
        defaultSlippage?: number | undefined;
        defaultAmount?: number | undefined;
    } | undefined;
}, {
    notifications?: {
        push?: boolean | undefined;
        email?: boolean | undefined;
        trades?: boolean | undefined;
        alerts?: boolean | undefined;
    } | undefined;
    trading?: {
        defaultSlippage?: number | undefined;
        defaultAmount?: number | undefined;
    } | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TradingExecuteInput = z.infer<typeof tradingExecuteSchema>;
export type TokenFeedQuery = z.infer<typeof tokenFeedQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
//# sourceMappingURL=zod.validators.d.ts.map