/**
 * Zod Validators
 * Centralized validation schemas using Zod
 */

import { z } from 'zod';

// Auth Validators
export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Trading Validators
export const tradingExecuteSchema = z.object({
  tokenMint: z.string().length(44).regex(/^[A-Za-z0-9]+$/),
  amount: z.number().positive().max(1000),
  slippage: z.number().min(0).max(100).default(5),
  walletIndex: z.number().int().min(0).optional(),
  type: z.enum(['buy', 'sell']),
});

export const createStopLossSchema = z.object({
  tokenMint: z.string().length(44),
  walletIndex: z.number().int().min(0),
  stopPrice: z.number().positive(),
  amount: z.number().positive().optional(),
});

export const createTakeProfitSchema = z.object({
  tokenMint: z.string().length(44),
  walletIndex: z.number().int().min(0),
  targetPrice: z.number().positive(),
  amount: z.number().positive().optional(),
});

// Wallet Validators
export const generateWalletsSchema = z.object({
  count: z.number().int().min(1).max(20).default(5),
});

export const distributeFromMasterSchema = z.object({
  walletIndices: z.array(z.number().int().min(0)).min(1),
  amountPerWallet: z.number().positive(),
});

export const recoverToMasterSchema = z.object({
  walletIndices: z.array(z.number().int().min(0)).optional(),
  recoverAll: z.boolean().default(false),
});

export const emergencyRecoverSchema = z.object({
  privateKey: z.string().min(1),
});

// Token Validators
export const tokenFeedQuerySchema = z.object({
  filter: z.enum(['all', 'new', 'graduating', 'trending']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  minLiquidity: z.coerce.number().min(0).optional(),
  maxAge: z.coerce.number().int().min(1).default(1440),
});

export const tokenMintParamSchema = z.object({
  mint: z.string().length(44).regex(/^[A-Za-z0-9]+$/),
});

// Alert Validators
export const createAlertSchema = z.object({
  tokenMint: z.string().length(44),
  type: z.enum(['price', 'volume', 'market_cap']),
  condition: z.enum(['above', 'below']),
  value: z.number().positive(),
  enabled: z.boolean().default(true),
});

// User Validators
export const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
});

export const updateSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    trades: z.boolean().optional(),
    alerts: z.boolean().optional(),
  }).optional(),
  trading: z.object({
    defaultSlippage: z.number().min(0).max(100).optional(),
    defaultAmount: z.number().positive().optional(),
  }).optional(),
});

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Export types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TradingExecuteInput = z.infer<typeof tradingExecuteSchema>;
export type TokenFeedQuery = z.infer<typeof tokenFeedQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;

