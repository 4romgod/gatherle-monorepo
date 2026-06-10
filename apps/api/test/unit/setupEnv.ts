// This file runs BEFORE test files are imported
// It sets environment variables that are needed during module loading
import { APPLICATION_STAGES, AWS_REGIONS } from '@gatherle/commons/server';
import { initLogger, LogLevel } from '@/utils/logger';

process.env.AWS_REGION = AWS_REGIONS.DUB;
process.env.STAGE = APPLICATION_STAGES.DEV;
process.env.MONGO_DB_URL = 'mock-url';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'none';

// Keep unit-test output focused on assertion failures instead of expected DAO error logs.
initLogger(LogLevel.NONE, true);
