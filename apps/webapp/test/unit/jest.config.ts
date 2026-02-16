import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '../../',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  testTimeout: 10000,
  testMatch: ['<rootDir>/test/unit/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    // Handle module aliases (matching tsconfig paths)
    '^@/(.*)$': '<rootDir>/$1',
    '^@ntlango/commons$': '<rootDir>/../../packages/commons/lib/index.ts',
    '^@ntlango/commons/(.*)$': '<rootDir>/../../packages/commons/lib/$1',
    'next/font/google$': '<rootDir>/test/unit/mocks/nextFontMock.ts',
    'next/font/local$': '<rootDir>/test/unit/mocks/nextFontLocalMock.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  // Transform ESM modules from node_modules
  transformIgnorePatterns: ['/node_modules/(?!(jose)/)'],
  setupFilesAfterEnv: ['<rootDir>/test/unit/setup.ts'],
  globalTeardown: '<rootDir>/test/unit/teardown.ts',
  collectCoverage: true,
  coverageDirectory: '<rootDir>/test/unit/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  collectCoverageFrom: [
    '<rootDir>/lib/utils/**/*.ts',
    '<rootDir>/data/validation/**/*.ts',
    '<rootDir>/hooks/**/use*.ts',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/index.ts',
  ],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/test/', '<rootDir>/.next/'],
  // Mock static assets and CSS
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

export default config;
