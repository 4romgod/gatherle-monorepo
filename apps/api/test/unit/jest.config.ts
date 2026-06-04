import type { Config } from 'jest';

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
    '^@gatherle/commons/server$': '<rootDir>/../../packages/commons/lib/server/index.ts',
    '^@gatherle/commons/server/(.*)$': '<rootDir>/../../packages/commons/lib/server/$1',
    // Map .js extension imports to .ts source files (required for Node16 module resolution with Jest)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  setupFiles: ['<rootDir>/test/unit/setupEnv.ts'],
  globalSetup: '<rootDir>/test/unit/setup.ts',
  globalTeardown: '<rootDir>/test/unit/teardown.ts',
  collectCoverage: true,
  coverageDirectory: '<rootDir>/test/unit/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  collectCoverageFrom: [
    '<rootDir>/lib/clients/**/*.ts',
    '<rootDir>/lib/mongodb/dao/**/*.ts',
    '!<rootDir>/lib/**/index.ts',
  ],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/test/'],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
};

export default config;
