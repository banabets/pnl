import * as Sentry from '@sentry/node';
import { Express } from 'express';
/**
 * Initialize Sentry error tracking
 */
export declare function initSentry(app?: Express): void;
/**
 * Sentry request handler middleware
 * Must be the first middleware
 */
export declare const sentryRequestHandler: () => any;
/**
 * Sentry tracing middleware
 * Should be after request handler
 */
export declare const sentryTracingHandler: () => any;
/**
 * Sentry error handler middleware
 * Must be before other error handlers but after all controllers
 */
export declare const sentryErrorHandler: () => (err: any, req: any, res: any, next: any) => void;
/**
 * Capture exception manually
 */
export declare function captureException(error: Error, context?: Record<string, any>): void;
/**
 * Capture message manually
 */
export declare function captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
/**
 * Set user context for error tracking
 */
export declare function setUser(user: {
    id: string;
    username?: string;
    email?: string;
}): void;
/**
 * Clear user context
 */
export declare function clearUser(): void;
/**
 * Add breadcrumb for debugging
 */
export declare function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void;
/**
 * Start a transaction for performance monitoring
 */
export declare function startTransaction(name: string, op: string): any;
/**
 * Close Sentry connection (call on app shutdown)
 */
export declare function closeSentry(): Promise<void>;
export default Sentry;
//# sourceMappingURL=sentry.d.ts.map