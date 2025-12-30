// Authentication Middleware
import { Request, Response, NextFunction } from 'express';
import { userAuthManager } from './user-auth';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  const result = userAuthManager.verifyToken(token);
  if (!result.success || !result.userId) {
    res.status(401).json({ error: result.error || 'Invalid or expired token' });
    return;
  }

  const user = userAuthManager.getUserById(result.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.userId = result.userId;
  req.user = user;
  next();
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const result = userAuthManager.verifyToken(token);
    if (result.success && result.userId) {
      const user = userAuthManager.getUserById(result.userId);
      if (user) {
        req.userId = result.userId;
        req.user = user;
      }
    }
  }

  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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


