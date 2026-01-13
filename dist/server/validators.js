"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrailingStopSchema = exports.createStopLossSchema = exports.cancelAlertSchema = exports.createAlertSchema = exports.emergencyRecoverSchema = exports.recoverToMasterSchema = exports.distributeFromMasterSchema = exports.walletImportSchema = exports.walletCreateSchema = exports.tradingStopSchema = exports.tradingExecuteSchema = exports.loginSchema = exports.registerSchema = void 0;
exports.validateRequest = validateRequest;
exports.formatZodErrors = formatZodErrors;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
// ============================================
// Authentication Validators
// ============================================
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be less than 20 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    email: zod_1.z.string()
        .email('Invalid email address')
        .toLowerCase(),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
exports.loginSchema = zod_1.z.object({
    usernameOrEmail: zod_1.z.string().min(1, 'Username or email is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// ============================================
// Trading Validators
// ============================================
exports.tradingExecuteSchema = zod_1.z.object({
    tokenMint: zod_1.z.string()
        .min(32, 'Invalid token mint address')
        .max(44, 'Invalid token mint address'),
    amount: zod_1.z.number()
        .positive('Amount must be positive')
        .finite('Amount must be a valid number'),
    slippage: zod_1.z.number()
        .min(0, 'Slippage must be non-negative')
        .max(100, 'Slippage cannot exceed 100%')
        .optional()
        .default(1),
    walletIndex: zod_1.z.number()
        .int('Wallet index must be an integer')
        .nonnegative('Wallet index must be non-negative')
        .optional()
        .default(0),
});
exports.tradingStopSchema = zod_1.z.object({
    botType: zod_1.z.enum(['sniper', 'dca', 'copy-trading'], {
        errorMap: () => ({ message: 'Invalid bot type' }),
    }).optional(),
});
// ============================================
// Wallet Validators
// ============================================
exports.walletCreateSchema = zod_1.z.object({
    count: zod_1.z.number()
        .int('Count must be an integer')
        .positive('Count must be positive')
        .max(100, 'Cannot create more than 100 wallets at once')
        .optional()
        .default(1),
});
exports.walletImportSchema = zod_1.z.object({
    privateKey: zod_1.z.string()
        .min(32, 'Invalid private key')
        .max(128, 'Invalid private key'),
});
// ============================================
// Fund Management Validators
// ============================================
exports.distributeFromMasterSchema = zod_1.z.object({
    amount: zod_1.z.number()
        .positive('Amount must be positive')
        .finite('Amount must be a valid number'),
    distributeTo: zod_1.z.enum(['all', 'specific'], {
        errorMap: () => ({ message: 'distributeTo must be "all" or "specific"' }),
    }),
    walletIndices: zod_1.z.array(zod_1.z.number().int().nonnegative())
        .optional(),
});
exports.recoverToMasterSchema = zod_1.z.object({
    fromWallet: zod_1.z.union([
        zod_1.z.literal('all'),
        zod_1.z.number().int().nonnegative(),
    ]),
    minAmount: zod_1.z.number()
        .nonnegative('Minimum amount must be non-negative')
        .optional()
        .default(0),
});
exports.emergencyRecoverSchema = zod_1.z.object({
    privateKey: zod_1.z.string()
        .min(32, 'Invalid private key')
        .max(128, 'Invalid private key'),
    destinationAddress: zod_1.z.string()
        .min(32, 'Invalid destination address')
        .max(44, 'Invalid destination address'),
});
// ============================================
// Alert Validators
// ============================================
exports.createAlertSchema = zod_1.z.object({
    tokenMint: zod_1.z.string()
        .min(32, 'Invalid token mint address')
        .max(44, 'Invalid token mint address'),
    tokenName: zod_1.z.string()
        .min(1, 'Token name is required')
        .max(100, 'Token name too long'),
    tokenSymbol: zod_1.z.string()
        .min(1, 'Token symbol is required')
        .max(20, 'Token symbol too long'),
    alertType: zod_1.z.enum(['price-above', 'price-below', 'volume-above', 'market-cap-above'], {
        errorMap: () => ({ message: 'Invalid alert type' }),
    }),
    targetValue: zod_1.z.number()
        .positive('Target value must be positive')
        .finite('Target value must be a valid number'),
});
exports.cancelAlertSchema = zod_1.z.object({
    alertId: zod_1.z.string()
        .min(1, 'Alert ID is required'),
});
// ============================================
// Stop-Loss Validators
// ============================================
exports.createStopLossSchema = zod_1.z.object({
    positionId: zod_1.z.string()
        .min(1, 'Position ID is required'),
    tokenMint: zod_1.z.string()
        .min(32, 'Invalid token mint address')
        .max(44, 'Invalid token mint address'),
    tokenName: zod_1.z.string()
        .min(1, 'Token name is required'),
    tokenSymbol: zod_1.z.string()
        .min(1, 'Token symbol is required'),
    walletIndex: zod_1.z.number()
        .int('Wallet index must be an integer')
        .nonnegative('Wallet index must be non-negative'),
    walletAddress: zod_1.z.string()
        .min(32, 'Invalid wallet address')
        .max(44, 'Invalid wallet address'),
    triggerPrice: zod_1.z.number()
        .positive('Trigger price must be positive')
        .finite('Trigger price must be a valid number'),
    amount: zod_1.z.number()
        .min(0, 'Amount must be at least 0')
        .max(100, 'Amount cannot exceed 100')
        .optional()
        .default(100),
});
exports.createTrailingStopSchema = zod_1.z.object({
    positionId: zod_1.z.string()
        .min(1, 'Position ID is required'),
    tokenMint: zod_1.z.string()
        .min(32, 'Invalid token mint address')
        .max(44, 'Invalid token mint address'),
    tokenName: zod_1.z.string()
        .min(1, 'Token name is required'),
    tokenSymbol: zod_1.z.string()
        .min(1, 'Token symbol is required'),
    walletIndex: zod_1.z.number()
        .int('Wallet index must be an integer')
        .nonnegative('Wallet index must be non-negative'),
    walletAddress: zod_1.z.string()
        .min(32, 'Invalid wallet address')
        .max(44, 'Invalid wallet address'),
    trailingPercent: zod_1.z.number()
        .min(1, 'Trailing percent must be at least 1%')
        .max(50, 'Trailing percent cannot exceed 50%'),
    currentPrice: zod_1.z.number()
        .positive('Current price must be positive')
        .finite('Current price must be a valid number'),
});
// ============================================
// Helper Functions
// ============================================
/**
 * Validate request body against a Zod schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated data or null if validation fails
 */
function validateRequest(schema, data) {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return { success: false, errors: error };
        }
        return { success: false };
    }
}
/**
 * Format Zod errors for API response
 * @param errors Zod validation errors
 * @returns Formatted error messages
 */
function formatZodErrors(errors) {
    return errors.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
    }));
}
/**
 * Express middleware to validate request body
 * @param schema Zod schema to validate against
 */
function validateBody(schema) {
    return (req, res, next) => {
        const result = validateRequest(schema, req.body);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: result.errors ? formatZodErrors(result.errors) : [],
            });
        }
        // Replace req.body with validated data (ensures type safety)
        req.body = result.data;
        next();
    };
}
/**
 * Express middleware to validate query parameters
 * @param schema Zod schema to validate against
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const result = validateRequest(schema, req.query);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: result.errors ? formatZodErrors(result.errors) : [],
            });
        }
        req.query = result.data;
        next();
    };
}
/**
 * Express middleware to validate route parameters
 * @param schema Zod schema to validate against
 */
function validateParams(schema) {
    return (req, res, next) => {
        const result = validateRequest(schema, req.params);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: result.errors ? formatZodErrors(result.errors) : [],
            });
        }
        req.params = result.data;
        next();
    };
}
//# sourceMappingURL=validators.js.map