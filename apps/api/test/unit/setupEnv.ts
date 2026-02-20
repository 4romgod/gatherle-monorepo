// This file runs BEFORE test files are imported
// It sets environment variables that are needed during module loading
import { APPLICATION_STAGES, AWS_REGIONS } from '@gatherle/commons';

process.env.AWS_REGION = AWS_REGIONS.Ireland;
process.env.STAGE = APPLICATION_STAGES.DEV;
process.env.MONGO_DB_URL = 'mock-url';
process.env.JWT_SECRET = 'test-secret';
