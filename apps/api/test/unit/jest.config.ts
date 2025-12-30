import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  testTimeout: 10000,
  testMatch: ['<rootDir>/test/unit/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(?!test)(.*)$': '<rootDir>/lib/$1',
    '^@/test/(.*)$': '<rootDir>/test/$1',
    '^@ntlango/commons$': '<rootDir>/../../packages/commons/lib/index.ts',
    '^@ntlango/commons/(.*)$': '<rootDir>/../../packages/commons/lib/$1',
  },
  globalSetup: '<rootDir>/test/unit/setup.ts',
  globalTeardown: '<rootDir>/test/unit/teardown.ts',
  collectCoverage: true,
  coverageDirectory: '<rootDir>/test/unit/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/test/'],
};

export default config;
