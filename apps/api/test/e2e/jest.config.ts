import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  testTimeout: 60000,
  testMatch: ['<rootDir>/test/e2e/**/*.e2e.[jt]s?(x)'],
  maxWorkers: 10,
  moduleNameMapper: {
    '^@/(?!test)(.*)$': '<rootDir>/lib/$1',
    '^@/test/(.*)$': '<rootDir>/test/$1',
    '^@gatherle/commons$': '<rootDir>/../../packages/commons/lib/index.ts',
    '^@gatherle/commons/(.*)$': '<rootDir>/../../packages/commons/lib/$1',
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
  globalSetup: '<rootDir>/test/e2e/setup.ts',
  globalTeardown: '<rootDir>/test/e2e/teardown.ts',
  detectOpenHandles: true,
  forceExit: true,
  // Enhanced reporting for clear test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test/e2e/reports',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
      },
    ],
    [
      '<rootDir>/test/utils/summaryReporter.ts',
      {
        outputFile: '<rootDir>/test/e2e/reports/summary.txt',
      },
    ],
  ],
};

export default config;
