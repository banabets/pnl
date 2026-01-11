import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express, Request, Response, NextFunction } from 'express';

/**
 * Initialize Sentry error tracking
 */
export function initSentry(app?: Express) {
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
      new ProfilingIntegration(),
    ],

    // Customize what gets sent to Sentry
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.data) {
        const data = event.request.data as any;

        // Remove sensitive fields
        if (data.password) delete data.password;
        if (data.privateKey) delete data.privateKey;
        if (data.encryptedPrivateKey) delete data.encryptedPrivateKey;
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
export const sentryRequestHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  return Sentry.Handlers.requestHandler();
};

/**
 * Sentry tracing middleware
 * Should be after request handler
 */
export const sentryTracingHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  return Sentry.Handlers.tracingHandler();
};

/**
 * Sentry error handler middleware
 * Must be before other error handlers but after all controllers
 */
export const sentryErrorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err: Error, req: Request, res: Response, next: NextFunction) => next(err);
  }
  return Sentry.Handlers.errorHandler();
};

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
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
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!process.env.SENTRY_DSN) {
    console.log(`Sentry message [${level}]:`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; username?: string; email?: string }) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.setUser({
    id: user.id,
    username: user.username,
    email: user.email,
  });
}

/**
 * Clear user context
 */
export function clearUser() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (!process.env.SENTRY_DSN) return;

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
export function startTransaction(name: string, op: string) {
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
export async function closeSentry() {
  if (!process.env.SENTRY_DSN) return;

  await Sentry.close(2000);
  console.log('✅ Sentry connection closed');
}

export default Sentry;
