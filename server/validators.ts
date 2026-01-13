import { z } from 'zod';

// ============================================
// Authentication Validators
// ============================================

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// Trading Validators
// ============================================

export const tradingExecuteSchema = z.object({
  tokenMint: z.string()
    .min(32, 'Invalid token mint address')
    .max(44, 'Invalid token mint address'),
  amount: z.number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number'),
  slippage: z.number()
    .min(0, 'Slippage must be non-negative')
    .max(100, 'Slippage cannot exceed 100%')
    .optional()
    .default(1),
  walletIndex: z.number()
    .int('Wallet index must be an integer')
    .nonnegative('Wallet index must be non-negative')
    .optional()
    .default(0),
});

export const tradingStopSchema = z.object({
  botType: z.enum(['sniper', 'dca', 'copy-trading'], {
    errorMap: () => ({ message: 'Invalid bot type' }),
  }).optional(),
});

// ============================================
// Wallet Validators
// ============================================

export const walletCreateSchema = z.object({
  count: z.number()
    .int('Count must be an integer')
    .positive('Count must be positive')
    .max(100, 'Cannot create more than 100 wallets at once')
    .optional()
    .default(1),
});

export const walletImportSchema = z.object({
  privateKey: z.string()
    .min(32, 'Invalid private key')
    .max(128, 'Invalid private key'),
});

// ============================================
// Fund Management Validators
// ============================================

export const distributeFromMasterSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number'),
  distributeTo: z.enum(['all', 'specific'], {
    errorMap: () => ({ message: 'distributeTo must be "all" or "specific"' }),
  }),
  walletIndices: z.array(z.number().int().nonnegative())
    .optional(),
});

export const recoverToMasterSchema = z.object({
  fromWallet: z.union([
    z.literal('all'),
    z.number().int().nonnegative(),
  ]),
  minAmount: z.number()
    .nonnegative('Minimum amount must be non-negative')
    .optional()
    .default(0),
});

export const emergencyRecoverSchema = z.object({
  privateKey: z.string()
    .min(32, 'Invalid private key')
    .max(128, 'Invalid private key'),
  destinationAddress: z.string()
    .min(32, 'Invalid destination address')
    .max(44, 'Invalid destination address'),
});

// ============================================
// Alert Validators
// ============================================

export const createAlertSchema = z.object({
  tokenMint: z.string()
    .min(32, 'Invalid token mint address')
    .max(44, 'Invalid token mint address'),
  tokenName: z.string()
    .min(1, 'Token name is required')
    .max(100, 'Token name too long'),
  tokenSymbol: z.string()
    .min(1, 'Token symbol is required')
    .max(20, 'Token symbol too long'),
  alertType: z.enum(['price-above', 'price-below', 'volume-above', 'market-cap-above'], {
    errorMap: () => ({ message: 'Invalid alert type' }),
  }),
  targetValue: z.number()
    .positive('Target value must be positive')
    .finite('Target value must be a valid number'),
});

export const cancelAlertSchema = z.object({
  alertId: z.string()
    .min(1, 'Alert ID is required'),
});

// ============================================
// Stop-Loss Validators
// ============================================

export const createStopLossSchema = z.object({
  positionId: z.string()
    .min(1, 'Position ID is required'),
  tokenMint: z.string()
    .min(32, 'Invalid token mint address')
    .max(44, 'Invalid token mint address'),
  tokenName: z.string()
    .min(1, 'Token name is required'),
  tokenSymbol: z.string()
    .min(1, 'Token symbol is required'),
  walletIndex: z.number()
    .int('Wallet index must be an integer')
    .nonnegative('Wallet index must be non-negative'),
  walletAddress: z.string()
    .min(32, 'Invalid wallet address')
    .max(44, 'Invalid wallet address'),
  triggerPrice: z.number()
    .positive('Trigger price must be positive')
    .finite('Trigger price must be a valid number'),
  amount: z.number()
    .min(0, 'Amount must be at least 0')
    .max(100, 'Amount cannot exceed 100')
    .optional()
    .default(100),
});

export const createTrailingStopSchema = z.object({
  positionId: z.string()
    .min(1, 'Position ID is required'),
  tokenMint: z.string()
    .min(32, 'Invalid token mint address')
    .max(44, 'Invalid token mint address'),
  tokenName: z.string()
    .min(1, 'Token name is required'),
  tokenSymbol: z.string()
    .min(1, 'Token symbol is required'),
  walletIndex: z.number()
    .int('Wallet index must be an integer')
    .nonnegative('Wallet index must be non-negative'),
  walletAddress: z.string()
    .min(32, 'Invalid wallet address')
    .max(44, 'Invalid wallet address'),
  trailingPercent: z.number()
    .min(1, 'Trailing percent must be at least 1%')
    .max(50, 'Trailing percent cannot exceed 50%'),
  currentPrice: z.number()
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
export function validateRequest<T>(schema: z.ZodSchema<T>, data: any): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export function formatZodErrors(errors: z.ZodError): Array<{ field: string; message: string }> {
  return errors.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Express middleware to validate request body
 * @param schema Zod schema to validate against
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
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
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
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
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
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
