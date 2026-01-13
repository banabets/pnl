/**
 * Zod Validators
 * Centralized validation schemas using Zod
 */
import { z } from 'zod';
export declare const registerSchema: any;
export declare const loginSchema: any;
export declare const changePasswordSchema: any;
export declare const forgotPasswordSchema: any;
export declare const tradingExecuteSchema: any;
export declare const createStopLossSchema: any;
export declare const createTakeProfitSchema: any;
export declare const generateWalletsSchema: any;
export declare const distributeFromMasterSchema: any;
export declare const recoverToMasterSchema: any;
export declare const emergencyRecoverSchema: any;
export declare const tokenFeedQuerySchema: any;
export declare const tokenMintParamSchema: any;
export declare const createAlertSchema: any;
export declare const updateProfileSchema: any;
export declare const updateSettingsSchema: any;
export declare const paginationSchema: any;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TradingExecuteInput = z.infer<typeof tradingExecuteSchema>;
export type TokenFeedQuery = z.infer<typeof tokenFeedQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
//# sourceMappingURL=zod.validators.d.ts.map