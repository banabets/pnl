"use strict";
/**
 * Zod Validators
 * Centralized validation schemas using Zod
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.updateSettingsSchema = exports.updateProfileSchema = exports.createAlertSchema = exports.tokenMintParamSchema = exports.tokenFeedQuerySchema = exports.emergencyRecoverSchema = exports.recoverToMasterSchema = exports.distributeFromMasterSchema = exports.generateWalletsSchema = exports.createTakeProfitSchema = exports.createStopLossSchema = exports.tradingExecuteSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Auth Validators
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
});
exports.loginSchema = zod_1.z.object({
    usernameOrEmail: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(100),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
// Trading Validators
exports.tradingExecuteSchema = zod_1.z.object({
    tokenMint: zod_1.z.string().length(44).regex(/^[A-Za-z0-9]+$/),
    amount: zod_1.z.number().positive().max(1000),
    slippage: zod_1.z.number().min(0).max(100).default(5),
    walletIndex: zod_1.z.number().int().min(0).optional(),
    type: zod_1.z.enum(['buy', 'sell']),
});
exports.createStopLossSchema = zod_1.z.object({
    tokenMint: zod_1.z.string().length(44),
    walletIndex: zod_1.z.number().int().min(0),
    stopPrice: zod_1.z.number().positive(),
    amount: zod_1.z.number().positive().optional(),
});
exports.createTakeProfitSchema = zod_1.z.object({
    tokenMint: zod_1.z.string().length(44),
    walletIndex: zod_1.z.number().int().min(0),
    targetPrice: zod_1.z.number().positive(),
    amount: zod_1.z.number().positive().optional(),
});
// Wallet Validators
exports.generateWalletsSchema = zod_1.z.object({
    count: zod_1.z.number().int().min(1).max(20).default(5),
});
exports.distributeFromMasterSchema = zod_1.z.object({
    walletIndices: zod_1.z.array(zod_1.z.number().int().min(0)).min(1),
    amountPerWallet: zod_1.z.number().positive(),
});
exports.recoverToMasterSchema = zod_1.z.object({
    walletIndices: zod_1.z.array(zod_1.z.number().int().min(0)).optional(),
    recoverAll: zod_1.z.boolean().default(false),
});
exports.emergencyRecoverSchema = zod_1.z.object({
    privateKey: zod_1.z.string().min(1),
});
// Token Validators
exports.tokenFeedQuerySchema = zod_1.z.object({
    filter: zod_1.z.enum(['all', 'new', 'graduating', 'trending']).default('all'),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    minLiquidity: zod_1.z.coerce.number().min(0).optional(),
    maxAge: zod_1.z.coerce.number().int().min(1).default(1440),
});
exports.tokenMintParamSchema = zod_1.z.object({
    mint: zod_1.z.string().length(44).regex(/^[A-Za-z0-9]+$/),
});
// Alert Validators
exports.createAlertSchema = zod_1.z.object({
    tokenMint: zod_1.z.string().length(44),
    type: zod_1.z.enum(['price', 'volume', 'market_cap']),
    condition: zod_1.z.enum(['above', 'below']),
    value: zod_1.z.number().positive(),
    enabled: zod_1.z.boolean().default(true),
});
// User Validators
exports.updateProfileSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).optional(),
    email: zod_1.z.string().email().optional(),
    bio: zod_1.z.string().max(500).optional(),
});
exports.updateSettingsSchema = zod_1.z.object({
    notifications: zod_1.z.object({
        email: zod_1.z.boolean().optional(),
        push: zod_1.z.boolean().optional(),
        trades: zod_1.z.boolean().optional(),
        alerts: zod_1.z.boolean().optional(),
    }).optional(),
    trading: zod_1.z.object({
        defaultSlippage: zod_1.z.number().min(0).max(100).optional(),
        defaultAmount: zod_1.z.number().positive().optional(),
    }).optional(),
});
// Pagination Schema
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=zod.validators.js.map