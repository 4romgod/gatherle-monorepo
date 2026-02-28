import type { Config } from 'jest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Recursively count files whose names match `pattern` under `dir`.
 * Used to derive `maxWorkers` so the config stays accurate as test files
 * are added or removed without any manual update.
 */
function countFiles(dir: string, pattern: RegExp): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        count += countFiles(join(dir, entry.name), pattern);
      } else if (pattern.test(entry.name)) {
        count++;
      }
    }
  } catch {
    // Directory may not exist in some environments (e.g. fresh checkout before
    // test files are generated). Fall through so count stays 0.
  }
  return count;
}

// __dirname is the directory of this config file (apps/api/test/e2e/).
// Count every *.test.[jt]s(x) file beneath it so maxWorkers always equals the
// number of test files. Tests are I/O-bound (network calls to Lambda) so more
// workers than CPU cores is safe. On GitHub Actions 2-core runners the default
// '100%' resolves to 2 workers, serialising 9 files into ~13 min batches; one
// worker-per-file cuts wall-clock time to the slowest single file (~3-4 min).
const e2eTestFileCount = countFiles(__dirname, /\.test\.[jt]sx?$/);
const maxE2eWorkers = Math.max(1, e2eTestFileCount);

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  testTimeout: 20000,
  testMatch: ['<rootDir>/test/e2e/**/*.test.[jt]s?(x)'],
  maxWorkers: maxE2eWorkers,
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
