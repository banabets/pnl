export declare const generalLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const tradingLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const walletLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const adminLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const readLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const alertsLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const fundsLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const rateLimiters: {
    general: import("express-rate-limit").RateLimitRequestHandler;
    auth: import("express-rate-limit").RateLimitRequestHandler;
    trading: import("express-rate-limit").RateLimitRequestHandler;
    wallet: import("express-rate-limit").RateLimitRequestHandler;
    admin: import("express-rate-limit").RateLimitRequestHandler;
    read: import("express-rate-limit").RateLimitRequestHandler;
    alerts: import("express-rate-limit").RateLimitRequestHandler;
    funds: import("express-rate-limit").RateLimitRequestHandler;
};
export declare function getRateLimiterForEndpoint(path: string, method: string): any;
//# sourceMappingURL=http-rate-limiter.d.ts.map