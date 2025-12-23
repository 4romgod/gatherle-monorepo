import type {Config} from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  testTimeout: 20000,
  testMatch: ['<rootDir>/test/integration/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(?!test)(.*)$': '<rootDir>/lib/$1',
    '^@/test/(.*)$': '<rootDir>/test/$1',
    '^@ntlango/commons$': '<rootDir>/../../packages/commons/lib/index.ts',
    '^@ntlango/commons/(.*)$': '<rootDir>/../../packages/commons/lib/$1',
  },
  globalSetup: '<rootDir>/test/integration/setup.ts',
  globalTeardown: '<rootDir>/test/integration/teardown.ts',
  detectOpenHandles: true,
  forceExit: true,
};

export default config;
