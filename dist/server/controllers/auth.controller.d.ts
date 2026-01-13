/**
 * Auth Controller
 * Handles authentication and user management logic
 */
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth-middleware';
/**
 * Register a new user
 */
export declare function registerUser(req: Request, res: Response): Promise<void>;
/**
 * Login user
 */
export declare function loginUser(req: Request, res: Response): Promise<void>;
/**
 * Logout user
 */
export declare function logoutUser(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * Get current user
 */
export declare function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * Get user by ID
 */
export declare function getUserById(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * Update user profile
 */
export declare function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * Update user settings
 */
export declare function updateSettings(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * Change password
 */
export declare function changePassword(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * Forgot password
 */
export declare function forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.controller.d.ts.map