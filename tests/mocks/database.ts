import { vi } from 'vitest';

// Mock User model
export const mockUserModel = {
  findOne: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
};

// Mock database connection
export const mockDatabase = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn(() => true),
};

// Helper to create mock user
export function createMockUser(overrides = {}) {
  return {
    _id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$10$...',
    role: 'user',
    createdAt: new Date(),
    save: vi.fn(),
    toObject: vi.fn(function() { return this; }),
    ...overrides,
  };
}

// Helper to create mock wallet
export function createMockWallet(overrides = {}) {
  return {
    _id: 'wallet-123',
    userId: 'user-123',
    index: 0,
    publicKey: 'mock-public-key',
    encryptedPrivateKey: 'mock-encrypted-key',
    iv: 'mock-iv',
    createdAt: new Date(),
    save: vi.fn(),
    toObject: vi.fn(function() { return this; }),
    ...overrides,
  };
}

// Helper to reset all mocks
export function resetDatabaseMocks() {
  Object.values(mockUserModel).forEach(fn => {
    if (typeof fn === 'function') {
      fn.mockReset();
    }
  });

  Object.values(mockDatabase).forEach(fn => {
    if (typeof fn === 'function') {
      fn.mockReset();
    }
  });
}
