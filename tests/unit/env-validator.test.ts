import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnvironment, validateOrThrow, getValidatedRpcUrl } from '../../server/env-validator';

describe('Environment Validator', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('validateEnvironment', () => {
    it('should pass validation with all required variables set', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.HELIUS_API_KEY = 'test-api-key';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail if JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.HELIUS_API_KEY = 'test-api-key';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should fail if JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short';
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.HELIUS_API_KEY = 'test-api-key';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET') && e.includes('32 characters'))).toBe(true);
    });

    it('should fail if ENCRYPTION_KEY is missing', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      delete process.env.ENCRYPTION_KEY;
      process.env.HELIUS_API_KEY = 'test-api-key';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ENCRYPTION_KEY'))).toBe(true);
    });

    it('should fail if ENCRYPTION_KEY is not 64 hex characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.ENCRYPTION_KEY = 'invalid-key';
      process.env.HELIUS_API_KEY = 'test-api-key';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ENCRYPTION_KEY') && e.includes('64 hex'))).toBe(true);
    });

    it('should fail if HELIUS_API_KEY is missing and no RPC_URL', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      delete process.env.HELIUS_API_KEY;
      delete process.env.RPC_URL;
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('HELIUS_API_KEY') || e.includes('RPC_URL'))).toBe(true);
    });

    it('should warn if using exposed API key', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.HELIUS_API_KEY = '7b05747c-b100-4159-ba5f-c85e8c8d3997'; // Exposed key
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('EXPOSED') || e.includes('REVOKE'))).toBe(true);
    });

    it('should warn if JWT_SECRET looks like default', () => {
      process.env.JWT_SECRET = 'your-secret-key-here-change-this-in-production';
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.HELIUS_API_KEY = 'test-api-key';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const result = validateEnvironment();

      expect(result.warnings.some(w => w.includes('JWT_SECRET') && w.includes('default'))).toBe(true);
    });

    it('should fail if MONGODB_URI is missing', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.HELIUS_API_KEY = 'test-api-key';
      delete process.env.MONGODB_URI;

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('MONGODB_URI'))).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw with valid environment', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      process.env.HELIUS_API_KEY = 'test-api-key';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      expect(() => validateOrThrow()).not.toThrow();
    });

    it('should exit process with invalid environment', () => {
      delete process.env.JWT_SECRET;

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      expect(() => validateOrThrow()).toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('getValidatedRpcUrl', () => {
    it('should return RPC_URL if set', () => {
      process.env.RPC_URL = 'https://custom-rpc.com';
      process.env.HELIUS_API_KEY = 'test-key';

      const url = getValidatedRpcUrl();

      expect(url).toBe('https://custom-rpc.com');
    });

    it('should return Helius URL if HELIUS_API_KEY is set', () => {
      delete process.env.RPC_URL;
      process.env.HELIUS_API_KEY = 'my-helius-key';

      const url = getValidatedRpcUrl();

      expect(url).toBe('https://mainnet.helius-rpc.com/?api-key=my-helius-key');
    });

    it('should return default Solana RPC if nothing is set', () => {
      delete process.env.RPC_URL;
      delete process.env.HELIUS_API_KEY;

      const url = getValidatedRpcUrl();

      expect(url).toBe('https://api.mainnet-beta.solana.com');
    });
  });
});
