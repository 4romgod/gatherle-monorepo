import { APPLICATION_STAGES } from '@ntlango/commons';
import { config } from 'dotenv';
import { z } from 'zod';
import { initLogger, LOG_LEVEL_MAP, LogLevel } from '@/utils/logger';

config();

type Stage = (typeof APPLICATION_STAGES)[keyof typeof APPLICATION_STAGES];

const stageEnumValues = Object.values(APPLICATION_STAGES) as [Stage, ...Stage[]];

const BaseEnvSchema = z.object({
  MONGO_DB_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  AWS_REGION: z.string().default('eu-west-1'),
  STAGE: z.enum(stageEnumValues).default(APPLICATION_STAGES.BETA),
  NTLANGO_SECRET_ARN: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  LOG_LEVEL: z
    .string()
    .toLowerCase()
    .optional()
    .default('info')
    .transform((val) => LOG_LEVEL_MAP[val] ?? LogLevel.INFO),
});

/**
 * Full schema with runtime validation.
 * Only run this when actually starting the server or running operations that need these values.
 */
const ValidatedEnvSchema = BaseEnvSchema.superRefine((env, ctx) => {
  if (env.STAGE === APPLICATION_STAGES.DEV) {
    if (!env.MONGO_DB_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGO_DB_URL'],
        message: 'MONGO_DB_URL is required in Dev',
      });
    }
    if (!env.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET is required in Dev',
      });
    }
  } else {
    if (!env.NTLANGO_SECRET_ARN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NTLANGO_SECRET_ARN'],
        message: 'NTLANGO_SECRET_ARN is required in staging/prod',
      });
    }
  }
});

// Parse with defaults but without validation at import time
const parsed = BaseEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Failed to parse environment configuration:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.length ? issue.path.join('.') : 'root'}: ${issue.message}`);
  });
  process.exit(1);
}

const env = parsed.data;

// Initialize logger with parsed config
initLogger(env.LOG_LEVEL, true);

/**
 * Validates that all required environment variables are present for the current stage.
 * Call this explicitly when starting the server or running operations that need these values.
 *
 * @throws {Error} If validation fails, logs errors and exits process
 */
export function validateEnv(): void {
  const validated = ValidatedEnvSchema.safeParse(process.env);

  if (!validated.success) {
    console.error('Invalid API environment configuration:');
    validated.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.length ? issue.path.join('.') : 'root'}: ${issue.message}`);
    });
    process.exit(1);
  }

  /**
   * Log configuration (excluding secrets)
   * Note: Using console.log here instead of logger because this is bootstrap logging
   * that happens immediately after logger initialization, ensuring config is always visible
   */
  const logLevel = Object.keys(LOG_LEVEL_MAP).find((key) => LOG_LEVEL_MAP[key] === env.LOG_LEVEL) || 'unknown';
  console.log(`[INFO] Environment configuration validated:`);
  console.log(`  - Stage: ${env.STAGE}`);
  console.log(`  - Region: ${env.AWS_REGION}`);
  console.log(`  - Log Level: ${logLevel}`);
  console.log(`  - MongoDB URL: ${env.MONGO_DB_URL ? '***configured***' : 'not set'}`);
  console.log(`  - JWT Secret: ${env.JWT_SECRET ? '***configured***' : 'not set'}`);
  console.log(`  - Secrets ARN: ${env.NTLANGO_SECRET_ARN || 'not set'}`);
  console.log(`  - S3 Bucket: ${env.S3_BUCKET_NAME || 'not set'}`);
}

export const AWS_REGION = env.AWS_REGION;
export const STAGE = env.STAGE;
export const MONGO_DB_URL = env.MONGO_DB_URL;
export const JWT_SECRET = env.JWT_SECRET;
export const NTLANGO_SECRET_ARN = env.NTLANGO_SECRET_ARN;
export const S3_BUCKET_NAME = env.S3_BUCKET_NAME;
export const LOG_LEVEL = env.LOG_LEVEL;
