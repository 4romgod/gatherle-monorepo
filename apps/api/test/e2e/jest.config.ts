import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  testTimeout: 20000,
  testMatch: ['<rootDir>/test/e2e/**/*.test.[jt]s?(x)'],
  // Use a fixed worker count matching the number of test files. Tests are
  // I/O-bound (network calls to Lambda) so more workers than CPU cores is safe.
  // GitHub Actions runners have only 2 cores; '100%' would limit to 2 workers
  // and run files nearly serially (~13 min). With 9 workers, all files run in
  // parallel and wall-clock time drops to the slowest file (~3-4 min).
  maxWorkers: 9,
  moduleNameMapper: {
    '^@/(?!test)(.*)$': '<rootDir>/lib/$1',
    '^@/test/(.*)$': '<rootDir>/test/$1',
    '^@gatherle/commons$': '<rootDir>/../../packages/commons/lib/index.ts',
    '^@gatherle/commons/(.*)$': '<rootDir>/../../packages/commons/lib/$1',
  },
  globalSetup: '<rootDir>/test/e2e/setup.ts',
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
