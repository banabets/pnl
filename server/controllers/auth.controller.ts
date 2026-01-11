/**
 * Auth Controller
 * Handles authentication and user management logic
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth-middleware';
import { User } from '../database';
import { log } from '../logger';
import { auditService } from '../services/audit.service';
import { NotFoundError, ValidationError, UnauthorizedError } from '../errors/app.error';
import { RegisterInput, LoginInput } from '../validators/zod.validators';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY: string = process.env.JWT_EXPIRY || '7d';

/**
 * Register a new user
 */
export async function registerUser(req: Request, res: Response) {
  const { username, email, password }: RegisterInput = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ValidationError('User with this email or username already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username,
    email,
    passwordHash,
  });

  // Generate token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: String(JWT_EXPIRY) });

  // Audit log
  await auditService.log(user.id, 'user_registered', 'user', {
    username,
    email,
  }, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  log.info('User registered', { userId: user.id, username });

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  });
}

/**
 * Login user
 */
export async function loginUser(req: Request, res: Response) {
  const { email, password }: LoginInput = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    await auditService.log(user.id, 'login_failed', 'auth', {
      reason: 'invalid_password',
    }, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: String(JWT_EXPIRY) });

  // Audit log
  await auditService.log(user.id, 'user_logged_in', 'auth', {}, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  log.info('User logged in', { userId: user.id, email });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  });
}

/**
 * Logout user
 */
export async function logoutUser(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;

  // Audit log
  await auditService.log(userId, 'user_logged_out', 'auth', {}, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Logged out successfully' });
}

/**
 * Get current user
 */
export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;

  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      settings: user.settings,
      stats: user.stats,
    },
  });
}

/**
 * Get user by ID
 */
export async function getUserById(req: AuthenticatedRequest, res: Response) {
  const { userId } = req.params;

  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  // Only return public info
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      profile: user.profile,
      stats: user.stats,
    },
  });
}

/**
 * Update user profile
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const updates = req.body;

  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  // Update profile
  if (updates.username) user.username = updates.username;
  if (updates.email) user.email = updates.email;
  if (updates.bio !== undefined) {
    user.profile = user.profile || {};
    user.profile.bio = updates.bio;
  }

  await user.save();

  // Audit log
  await auditService.log(userId, 'profile_updated', 'user', { updates }, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      profile: user.profile,
    },
  });
}

/**
 * Update user settings
 */
export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const updates = req.body;

  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  // Initialize settings if not exists
  if (!user.settings) {
    user.settings = {
      theme: 'auto',
      notifications: {
        email: false,
        priceAlerts: false,
        tradeAlerts: false,
      },
      trading: {
        defaultSlippage: 1,
        defaultWalletIndex: 0,
      },
    };
  }

  // Update settings
  if (updates.notifications) {
    user.settings.notifications = {
      ...(user.settings.notifications || {}),
      ...updates.notifications,
    };
  }

  if (updates.trading) {
    user.settings.trading = {
      ...(user.settings.trading || {}),
      ...updates.trading,
    };
  }

  await user.save();

  res.json({
    success: true,
    settings: user.settings,
  });
}

/**
 * Change password
 */
export async function changePassword(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;

  const user = await User.findOne({ id: userId });
  if (!user) {
    throw new NotFoundError('User', userId);
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    await auditService.log(userId, 'password_change_failed', 'auth', {
      reason: 'invalid_current_password',
    }, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
    });
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Update password
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  // Audit log
  await auditService.log(userId, 'password_changed', 'auth', {}, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Password changed successfully' });
}

/**
 * Forgot password
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists
    return res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  }

  // TODO: Implement password reset email
  // For now, just log
  log.info('Password reset requested', { userId: user.id, email });

  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent.',
  });
}

