/**
 * Jest setup file for webapp unit tests.
 * Runs before each test file.
 */

// Mock Next.js headers for server-side utilities
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'host') return 'localhost:3000';
      return null;
    }),
  })),
}));

// Mock environment variables
jest.mock('@/lib/constants/environment-variables', () => ({
  NEXTAUTH_SECRET: 'test-secret-key-for-unit-tests',
  GRAPHQL_URL: 'http://localhost:9000/v1/graphql',
  WEBSOCKET_URL: 'ws://localhost:3001',
}));

console.log('Setting up webapp unit tests...');
