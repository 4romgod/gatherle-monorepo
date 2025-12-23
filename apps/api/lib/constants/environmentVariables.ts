import {APPLICATION_STAGES} from '@ntlango/commons';
import {config} from 'dotenv';
import {z} from 'zod';

config();

type Stage = (typeof APPLICATION_STAGES)[keyof typeof APPLICATION_STAGES];

const stageEnumValues = Object.values(APPLICATION_STAGES) as [Stage, ...Stage[]];

const EnvSchema = z
  .object({
    MONGO_DB_URL: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    AWS_REGION: z.string().default('eu-west-1'),
    STAGE: z.enum(stageEnumValues).default(APPLICATION_STAGES.DEV),
    NTLANGO_SECRET_ARN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
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

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid API environment configuration:');
  parsed.error.issues.forEach((issue) => {
    console.error(
      `  ${issue.path.length ? issue.path.join('.') : 'root'}: ${issue.message}`,
    );
  });
  process.exit(1);
}

const env = parsed.data;

export const AWS_REGION = env.AWS_REGION;
export const STAGE = env.STAGE;
export const MONGO_DB_URL = env.MONGO_DB_URL;
export const JWT_SECRET = env.JWT_SECRET;
export const NTLANGO_SECRET_ARN = env.NTLANGO_SECRET_ARN;
