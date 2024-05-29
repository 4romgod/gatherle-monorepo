import type {Config} from 'jest';

const config: Config = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
    testTimeout: 10000,
    testMatch: [
        '<rootDir>/test/canary/**/*.test.[jt]s?(x)',
        '<rootDir>/test/integration/**/user.test.[jt]s?(x)',
        '<rootDir>/test/unit/**/*.test.[jt]s?(x)',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/lib/$1',
    },
};

export default config;
