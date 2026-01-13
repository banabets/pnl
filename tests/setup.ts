import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables if not already set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-min-32-chars';
}

if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64 char hex for testing
}

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/pnl-onl-test';
}

if (!process.env.HELIUS_API_KEY) {
  process.env.HELIUS_API_KEY = 'test-helius-api-key';
}

if (!process.env.RPC_URL) {
  process.env.RPC_URL = 'https://api.mainnet-beta.solana.com';
}

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Optionally silence console logs in tests
  if (process.env.SILENT_TESTS === 'true') {
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
beforeEach(() => {
  // You can add global setup for each test here
});

afterEach(() => {
  // You can add global cleanup for each test here
});
