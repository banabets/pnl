import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter for general API endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Strict limiter for authentication endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the maximum number of authentication attempts. Please try again in 15 minutes.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Moderate limiter for trading operations (prevent spam)
export const tradingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 trading operations per minute
  message: 'Too many trading operations, please slow down.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many trading operations',
      message: 'You are sending too many trading requests. Please wait a moment before trying again.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Strict limiter for wallet operations (very sensitive)
export const walletLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 wallet operations per minute
  message: 'Too many wallet operations, please slow down.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many wallet operations',
      message: 'You are sending too many wallet requests. Please wait a moment.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Very strict limiter for admin operations
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 admin operations per minute
  message: 'Too many admin operations, please slow down.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many admin operations',
      message: 'You are sending too many admin requests. Please wait.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Relaxed limiter for read-only operations
export const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 read operations per minute
  message: 'Too many read requests, please slow down.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many read requests',
      message: 'You are reading data too quickly. Please slow down.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Moderate limiter for price alerts
export const alertsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 alert operations per minute
  message: 'Too many alert operations, please slow down.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many alert operations',
      message: 'You are sending too many alert requests. Please wait.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Very strict limiter for fund operations
export const fundsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 fund operations per minute
  message: 'Too many fund operations, please slow down.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many fund operations',
      message: 'You are sending too many fund transfer requests. This is a security measure.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Export all limiters
export const rateLimiters = {
  general: generalLimiter,
  auth: authLimiter,
  trading: tradingLimiter,
  wallet: walletLimiter,
  admin: adminLimiter,
  read: readLimiter,
  alerts: alertsLimiter,
  funds: fundsLimiter,
};

// Helper function to get appropriate limiter for endpoint
export function getRateLimiterForEndpoint(path: string, method: string): any {
  // Authentication endpoints
  if (path.includes('/api/auth/login') || path.includes('/api/auth/register')) {
    return authLimiter;
  }

  // Admin endpoints
  if (path.includes('/api/funds/emergency-recover')) {
    return adminLimiter;
  }

  // Fund operations (very critical)
  if (path.includes('/api/funds/')) {
    return fundsLimiter;
  }

  // Wallet operations (critical)
  if (path.includes('/api/wallets/') && method !== 'GET') {
    return walletLimiter;
  }

  // Trading operations
  if (path.includes('/api/pumpfun/') || path.includes('/api/volume/')) {
    return tradingLimiter;
  }

  // Alert operations
  if (path.includes('/api/alerts/')) {
    return alertsLimiter;
  }

  // Read-only operations (GET requests)
  if (method === 'GET') {
    return readLimiter;
  }

  // Default to general limiter
  return generalLimiter;
}
