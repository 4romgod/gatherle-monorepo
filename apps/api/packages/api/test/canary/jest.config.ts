import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  testTimeout: 10000,
  testMatch: ['<rootDir>/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(?!test)(.*)$': '<rootDir>/../../lib/$1',
    '^@/test/(.*)$': '<rootDir>/../../test/$1',
  },
  globalSetup: '<rootDir>/setup.ts',
  globalTeardown: '<rootDir>/teardown.ts',
  detectOpenHandles: true,
  forceExit: true,
};

export default config;
