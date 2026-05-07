import type { Config } from 'jest';
import { API_E2E_MAX_WORKERS } from './config';

function readBooleanEnv(name: string): boolean {
  const value = process.env[name];
  return value === '1' || value === 'true';
}

const maxE2eWorkers = API_E2E_MAX_WORKERS;

// Jest documents that detectOpenHandles implies runInBand. Keep it opt-in for
// debugging so CI can actually use the configured worker pool by default.
const detectOpenHandles = readBooleanEnv('JEST_DETECT_OPEN_HANDLES');
const forceExit = readBooleanEnv('JEST_FORCE_EXIT');

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  testTimeout: 60000,
  testMatch: ['<rootDir>/test/e2e/**/*.e2e.[jt]s?(x)'],
  maxWorkers: maxE2eWorkers,
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
  detectOpenHandles,
  forceExit,
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
