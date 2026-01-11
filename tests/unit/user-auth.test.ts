import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('User Authentication', () => {
  let userAuthModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Set required env vars
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';

    // Import fresh module
    userAuthModule = await import('../../server/user-auth');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hashed = await userAuthModule.hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'mySecurePassword123';
      const hash1 = await userAuthModule.hashPassword(password);
      const hash2 = await userAuthModule.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'mySecurePassword123';
      const hashed = await userAuthModule.hashPassword(password);

      const isValid = await userAuthModule.verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123';
      const wrongPassword = 'wrongPassword456';
      const hashed = await userAuthModule.hashPassword(password);

      const isValid = await userAuthModule.verifyPassword(wrongPassword, hashed);

      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = 'mySecurePassword123';
      const hashed = await userAuthModule.hashPassword(password);

      const isValid = await userAuthModule.verifyPassword('', hashed);

      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      };

      const token = userAuthModule.generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include payload in token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'admin',
      };

      const token = userAuthModule.generateToken(payload);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      expect(decoded.userId).toBe('user-123');
      expect(decoded.username).toBe('testuser');
      expect(decoded.role).toBe('admin');
    });

    it('should set expiration time', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      };

      const token = userAuthModule.generateToken(payload);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      };

      const token = userAuthModule.generateToken(payload);
      const decoded = userAuthModule.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe('user-123');
      expect(decoded.username).toBe('testuser');
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';

      const decoded = userAuthModule.verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should reject expired token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      };

      // Create token that expires in -1 hour (already expired)
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '-1h' });

      const decoded = userAuthModule.verifyToken(expiredToken);

      expect(decoded).toBeNull();
    });

    it('should reject token with wrong secret', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      };

      const tokenWithWrongSecret = jwt.sign(payload, 'wrong-secret', { expiresIn: '24h' });

      const decoded = userAuthModule.verifyToken(tokenWithWrongSecret);

      expect(decoded).toBeNull();
    });
  });

  describe('authenticateToken middleware', () => {
    it('should authenticate valid token in Authorization header', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      };

      const token = userAuthModule.generateToken(payload);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      userAuthModule.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('user-123');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      const req = {
        headers: {},
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      userAuthModule.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('should reject request with invalid token', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      userAuthModule.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should reject malformed Authorization header', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat',
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      userAuthModule.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole middleware', () => {
    it('should allow user with correct role', () => {
      const req = {
        user: {
          userId: 'user-123',
          role: 'admin',
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      const middleware = userAuthModule.requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user without correct role', () => {
      const req = {
        user: {
          userId: 'user-123',
          role: 'user',
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      const middleware = userAuthModule.requireRole(['admin']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });

    it('should allow user with any of the allowed roles', () => {
      const req = {
        user: {
          userId: 'user-123',
          role: 'premium',
        },
      } as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      const middleware = userAuthModule.requireRole(['admin', 'premium']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without user object', () => {
      const req = {} as any;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      const middleware = userAuthModule.requireRole(['admin']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
