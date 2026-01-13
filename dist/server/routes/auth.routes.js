"use strict";
/**
 * Auth Routes
 * Authentication and user management endpoints
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_rate_limiter_1 = require("../http-rate-limiter");
const auth_middleware_1 = require("../auth-middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const zod_validators_1 = require("../validators/zod.validators");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Register
router.post('/register', http_rate_limiter_1.authLimiter, (0, validation_middleware_1.validateBody)(zod_validators_1.registerSchema), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Implementation moved to controller
    const { registerUser } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await registerUser(req, res);
}));
// Login
router.post('/login', http_rate_limiter_1.authLimiter, (0, validation_middleware_1.validateBody)(zod_validators_1.loginSchema), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { loginUser } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await loginUser(req, res);
}));
// Logout
router.post('/logout', auth_middleware_1.authenticateToken, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { logoutUser } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await logoutUser(req, res);
}));
// Get current user
router.get('/me', http_rate_limiter_1.readLimiter, auth_middleware_1.authenticateToken, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { getCurrentUser } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await getCurrentUser(req, res);
}));
// Get user by ID
router.get('/user/:userId', http_rate_limiter_1.readLimiter, auth_middleware_1.optionalAuth, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { getUserById } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await getUserById(req, res);
}));
// Update profile
router.put('/user/:userId/profile', auth_middleware_1.authenticateToken, (0, validation_middleware_1.validateBody)(zod_validators_1.updateProfileSchema), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { updateProfile } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await updateProfile(req, res);
}));
// Update settings
router.put('/user/:userId/settings', auth_middleware_1.authenticateToken, (0, validation_middleware_1.validateBody)(zod_validators_1.updateSettingsSchema), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { updateSettings } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await updateSettings(req, res);
}));
// Change password
router.post('/user/:userId/change-password', auth_middleware_1.authenticateToken, (0, validation_middleware_1.validateBody)(zod_validators_1.changePasswordSchema), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { changePassword } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await changePassword(req, res);
}));
// Forgot password
router.post('/forgot-password', http_rate_limiter_1.authLimiter, (0, validation_middleware_1.validateBody)(zod_validators_1.forgotPasswordSchema), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { forgotPassword } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
    await forgotPassword(req, res);
}));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map