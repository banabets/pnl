/**
 * Auth Routes
 * Authentication and user management endpoints
 */

import { Router } from 'express';
import { authLimiter, readLimiter } from '../http-rate-limiter';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../auth-middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  updateProfileSchema,
  updateSettingsSchema,
} from '../validators/zod.validators';
import { asyncHandler } from '../middleware/error.middleware';
import { auditService } from '../services/audit.service';
import { User } from '../database';
import { log } from '../logger';
import { NotFoundError, ValidationError } from '../errors/app.error';

const router = Router();

// Register
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    // Implementation moved to controller
    const { registerUser } = await import('../controllers/auth.controller');
    await registerUser(req, res);
  })
);

// Login
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { loginUser } = await import('../controllers/auth.controller');
    await loginUser(req, res);
  })
);

// Logout
router.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { logoutUser } = await import('../controllers/auth.controller');
    await logoutUser(req, res);
  })
);

// Get current user
router.get(
  '/me',
  readLimiter,
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { getCurrentUser } = await import('../controllers/auth.controller');
    await getCurrentUser(req, res);
  })
);

// Get user by ID
router.get(
  '/user/:userId',
  readLimiter,
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { getUserById } = await import('../controllers/auth.controller');
    await getUserById(req, res);
  })
);

// Update profile
router.put(
  '/user/:userId/profile',
  authenticateToken,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { updateProfile } = await import('../controllers/auth.controller');
    await updateProfile(req, res);
  })
);

// Update settings
router.put(
  '/user/:userId/settings',
  authenticateToken,
  validateBody(updateSettingsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { updateSettings } = await import('../controllers/auth.controller');
    await updateSettings(req, res);
  })
);

// Change password
router.post(
  '/user/:userId/change-password',
  authenticateToken,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { changePassword } = await import('../controllers/auth.controller');
    await changePassword(req, res);
  })
);

// Forgot password
router.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { forgotPassword } = await import('../controllers/auth.controller');
    await forgotPassword(req, res);
  })
);

export default router;

