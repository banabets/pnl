"use strict";
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
exports.sentryErrorHandler = exports.sentryTracingHandler = exports.sentryRequestHandler = void 0;
exports.initSentry = initSentry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.setUser = setUser;
exports.clearUser = clearUser;
exports.addBreadcrumb = addBreadcrumb;
exports.startTransaction = startTransaction;
exports.closeSentry = closeSentry;
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
/**
 * Initialize Sentry error tracking
 */
function initSentry(app) {
    // Only initialize if DSN is provided
    if (!process.env.SENTRY_DSN) {
        console.log('⚠️  Sentry DSN not configured, error tracking disabled');
        return;
    }
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',
        // Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Profiling
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        integrations: [
            new profiling_node_1.ProfilingIntegration(),
        ],
        // Customize what gets sent to Sentry
        beforeSend(event, hint) {
            // Filter out sensitive data
            if (event.request?.data) {
                const data = event.request.data;
                // Remove sensitive fields
                if (data.password)
                    delete data.password;
                if (data.privateKey)
                    delete data.privateKey;
                if (data.encryptedPrivateKey)
                    delete data.encryptedPrivateKey;
            }
            return event;
        },
        // Ignore certain errors
        ignoreErrors: [
            'NetworkError',
            'Non-Error promise rejection',
            'ResizeObserver loop limit exceeded',
        ],
    });
    console.log('✅ Sentry error tracking initialized');
}
/**
 * Sentry request handler middleware
 * Must be the first middleware
 */
const sentryRequestHandler = () => {
    if (!process.env.SENTRY_DSN) {
        return (req, res, next) => next();
    }
    return Sentry.Handlers.requestHandler();
};
exports.sentryRequestHandler = sentryRequestHandler;
/**
 * Sentry tracing middleware
 * Should be after request handler
 */
const sentryTracingHandler = () => {
    if (!process.env.SENTRY_DSN) {
        return (req, res, next) => next();
    }
    return Sentry.Handlers.tracingHandler();
};
exports.sentryTracingHandler = sentryTracingHandler;
/**
 * Sentry error handler middleware
 * Must be before other error handlers but after all controllers
 */
const sentryErrorHandler = () => {
    if (!process.env.SENTRY_DSN) {
        return (err, _req, _res, next) => next(err);
    }
    return Sentry.Handlers.errorHandler();
};
exports.sentryErrorHandler = sentryErrorHandler;
/**
 * Capture exception manually
 */
function captureException(error, context) {
    if (!process.env.SENTRY_DSN) {
        console.error('Exception:', error);
        return;
    }
    Sentry.withScope((scope) => {
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                scope.setContext(key, value);
            });
        }
        Sentry.captureException(error);
    });
}
/**
 * Capture message manually
 */
function captureMessage(message, level = 'info') {
    if (!process.env.SENTRY_DSN) {
        console.log(`Sentry message [${level}]:`, message);
        return;
    }
    Sentry.captureMessage(message, level);
}
/**
 * Set user context for error tracking
 */
function setUser(user) {
    if (!process.env.SENTRY_DSN)
        return;
    Sentry.setUser({
        id: user.id,
        username: user.username,
        email: user.email,
    });
}
/**
 * Clear user context
 */
function clearUser() {
    if (!process.env.SENTRY_DSN)
        return;
    Sentry.setUser(null);
}
/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(message, category, data) {
    if (!process.env.SENTRY_DSN)
        return;
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
    });
}
/**
 * Start a transaction for performance monitoring
 */
function startTransaction(name, op) {
    if (!process.env.SENTRY_DSN) {
        return null;
    }
    return Sentry.startTransaction({
        name,
        op,
    });
}
/**
 * Close Sentry connection (call on app shutdown)
 */
async function closeSentry() {
    if (!process.env.SENTRY_DSN)
        return;
    await Sentry.close(2000);
    console.log('✅ Sentry connection closed');
}
exports.default = Sentry;
//# sourceMappingURL=sentry.js.map