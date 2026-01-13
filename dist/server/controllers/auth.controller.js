"use strict";
/**
 * Auth Controller
 * Handles authentication and user management logic
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.logoutUser = logoutUser;
exports.getCurrentUser = getCurrentUser;
exports.getUserById = getUserById;
exports.updateProfile = updateProfile;
exports.updateSettings = updateSettings;
exports.changePassword = changePassword;
exports.forgotPassword = forgotPassword;
const database_1 = require("../database");
const logger_1 = require("../logger");
const audit_service_1 = require("../services/audit.service");
const app_error_1 = require("../errors/app.error");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
/**
 * Register a new user
 */
async function registerUser(req, res) {
    const { username, email, password } = req.body;
    // Check if user already exists
    const existingUser = await database_1.User.findOne({
        $or: [{ email }, { username }],
    });
    if (existingUser) {
        throw new app_error_1.ValidationError('User with this email or username already exists');
    }
    // Hash password
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    // Create user
    const user = await database_1.User.create({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        email,
        passwordHash,
    });
    // Generate token
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    // Audit log
    await audit_service_1.auditService.log(user.id, 'user_registered', 'user', {
        username,
        email,
    }, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    logger_1.log.info('User registered', { userId: user.id, username });
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
async function loginUser(req, res) {
    const { email, password } = req.body;
    // Find user
    const user = await database_1.User.findOne({ email });
    if (!user) {
        throw new app_error_1.UnauthorizedError('Invalid email or password');
    }
    // Check password
    const isValid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!isValid) {
        await audit_service_1.auditService.log(user.id, 'login_failed', 'auth', {
            reason: 'invalid_password',
        }, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: false,
        });
        throw new app_error_1.UnauthorizedError('Invalid email or password');
    }
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    // Generate token
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    // Audit log
    await audit_service_1.auditService.log(user.id, 'user_logged_in', 'auth', {}, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    logger_1.log.info('User logged in', { userId: user.id, email });
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
async function logoutUser(req, res) {
    const userId = req.userId;
    // Audit log
    await audit_service_1.auditService.log(userId, 'user_logged_out', 'auth', {}, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, message: 'Logged out successfully' });
}
/**
 * Get current user
 */
async function getCurrentUser(req, res) {
    const userId = req.userId;
    const user = await database_1.User.findOne({ id: userId });
    if (!user) {
        throw new app_error_1.NotFoundError('User', userId);
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
async function getUserById(req, res) {
    const { userId } = req.params;
    const user = await database_1.User.findOne({ id: userId });
    if (!user) {
        throw new app_error_1.NotFoundError('User', userId);
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
async function updateProfile(req, res) {
    const userId = req.userId;
    const updates = req.body;
    const user = await database_1.User.findOne({ id: userId });
    if (!user) {
        throw new app_error_1.NotFoundError('User', userId);
    }
    // Update profile
    if (updates.username)
        user.username = updates.username;
    if (updates.email)
        user.email = updates.email;
    if (updates.bio !== undefined) {
        user.profile = user.profile || {};
        user.profile.bio = updates.bio;
    }
    await user.save();
    // Audit log
    await audit_service_1.auditService.log(userId, 'profile_updated', 'user', { updates }, {
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
async function updateSettings(req, res) {
    const userId = req.userId;
    const updates = req.body;
    const user = await database_1.User.findOne({ id: userId });
    if (!user) {
        throw new app_error_1.NotFoundError('User', userId);
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
async function changePassword(req, res) {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;
    const user = await database_1.User.findOne({ id: userId });
    if (!user) {
        throw new app_error_1.NotFoundError('User', userId);
    }
    // Verify current password
    const isValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        await audit_service_1.auditService.log(userId, 'password_change_failed', 'auth', {
            reason: 'invalid_current_password',
        }, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: false,
        });
        throw new app_error_1.UnauthorizedError('Current password is incorrect');
    }
    // Update password
    user.passwordHash = await bcrypt_1.default.hash(newPassword, 10);
    await user.save();
    // Audit log
    await audit_service_1.auditService.log(userId, 'password_changed', 'auth', {}, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, message: 'Password changed successfully' });
}
/**
 * Forgot password
 */
async function forgotPassword(req, res) {
    const { email } = req.body;
    const user = await database_1.User.findOne({ email });
    if (!user) {
        // Don't reveal if user exists
        return res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.',
        });
    }
    // TODO: Implement password reset email
    // For now, just log
    logger_1.log.info('Password reset requested', { userId: user.id, email });
    res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
    });
}
//# sourceMappingURL=auth.controller.js.map