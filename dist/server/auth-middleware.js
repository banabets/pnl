"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const user_auth_1 = require("./user-auth");
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        res.status(401).json({ error: 'Authentication token required' });
        return;
    }
    try {
        const result = await user_auth_1.userAuthManager.verifyToken(token);
        if (!result.success || !result.userId) {
            res.status(401).json({ error: result.error || 'Invalid or expired token' });
            return;
        }
        const user = await user_auth_1.userAuthManager.getUserById(result.userId);
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.userId = result.userId;
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const result = await user_auth_1.userAuthManager.verifyToken(token);
            if (result.success && result.userId) {
                const user = await user_auth_1.userAuthManager.getUserById(result.userId);
                if (user) {
                    req.userId = result.userId;
                    req.user = user;
                }
            }
        }
        catch (error) {
            // Ignore errors in optional auth
            console.warn('Optional auth error:', error);
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth-middleware.js.map