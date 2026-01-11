# Testing Guide

This directory contains all tests for the PNL.onl project.

## Test Structure

```
tests/
├── setup.ts              # Global test setup and configuration
├── unit/                 # Unit tests for individual modules
│   ├── env-validator.test.ts
│   ├── price-alerts.test.ts
│   ├── stop-loss-manager.test.ts
│   └── user-auth.test.ts
├── integration/          # Integration tests for endpoints
│   └── auth-endpoints.test.ts
└── mocks/                # Mock helpers and utilities
    └── database.ts
```

## Running Tests

### Install Dependencies

First, install the testing dependencies:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run with Coverage

```bash
npm run test:coverage
```

This will generate a coverage report in the `coverage/` directory.

### Run Specific Test Suite

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Specific file
npx vitest run tests/unit/env-validator.test.ts
```

### View Coverage Report

After running coverage, open the HTML report:

```bash
open coverage/index.html
```

## Test Environment

Tests use a separate `.env.test` file with test-specific configuration:

- `JWT_SECRET`: Test JWT secret
- `ENCRYPTION_KEY`: Test encryption key
- `MONGODB_URI`: Test database (mongodb://localhost:27017/pnl-onl-test)
- `SILENT_TESTS`: Set to `true` to reduce console noise

## Writing Tests

### Unit Tests

Unit tests should test individual functions and modules in isolation:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyModule', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### Mocking Dependencies

Use Vitest's `vi.mock()` to mock dependencies:

```typescript
vi.mock('../../server/database', () => ({
  isConnected: vi.fn(() => true),
}));
```

### Integration Tests

Integration tests should test multiple modules working together:

```typescript
import request from 'supertest';
import { app } from '../../server/index';

describe('API Endpoint', () => {
  it('should return data', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
```

## Coverage Goals

We aim for >80% code coverage across:

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## CI/CD Integration

Tests automatically run in CI/CD pipeline on:

- Every pull request
- Every commit to main branch
- Before deployment

## Troubleshooting

### MongoDB Connection Issues

If tests fail due to MongoDB connection:

1. Ensure MongoDB is running locally
2. Or update `.env.test` to use a test database URI
3. Or mock the database connection in tests

### Timeout Issues

If tests timeout, increase the timeout in `vitest.config.ts`:

```typescript
testTimeout: 30000, // 30 seconds
```

### Silent Mode

To see all console output during tests, set in `.env.test`:

```bash
SILENT_TESTS=false
```

## Best Practices

1. **Test in isolation**: Each test should be independent
2. **Clean up**: Use `beforeEach` and `afterEach` to reset state
3. **Mock external dependencies**: Don't rely on external APIs or databases
4. **Test edge cases**: Test error conditions, not just happy paths
5. **Keep tests fast**: Unit tests should run in milliseconds
6. **Descriptive names**: Test names should clearly describe what they test
7. **Arrange-Act-Assert**: Structure tests clearly

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Best Practices](https://testingjavascript.com)
