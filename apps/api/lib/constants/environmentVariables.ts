import {APPLICATION_STAGES} from '@ntlango/commons';
import {config} from 'dotenv';
import {z} from 'zod';
import {GRAPHQL_API_PATH} from './constants';

config();

// type Stage = (typeof APPLICATION_STAGES)[keyof typeof APPLICATION_STAGES];

// const stageEnumValues = Object.values(APPLICATION_STAGES) as [Stage, ...Stage[]];

// const EnvSchema = z.object({
//   API_DOMAIN: z.string().default('http://localhost'),
//   API_PORT: z.coerce.number().int().positive().default(3000),
//   AWS_REGION: z.string().default('us-east-1'),
//   STAGE: z.enum(stageEnumValues).default(APPLICATION_STAGES.DEV),
//   GRAPHQL_URL: z.string().url().optional(),
//   MONGO_DB_URL: z.string().min(1, 'MONGO_DB_URL is required'),
//   JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
//   NTLANGO_SECRET_ARN: z.string().optional(),
// });

// const env = EnvSchema.parse(process.env);

export const API_DOMAIN = process.env.API_DOMAIN;
export const API_PORT = process.env.API_PORT;
export const AWS_REGION = process.env.AWS_REGION;
export const STAGE = process.env.STAGE;
export const GRAPHQL_URL =
  STAGE === APPLICATION_STAGES.DEV
    ? `${API_DOMAIN}:${API_PORT}${GRAPHQL_API_PATH}`
    : process.env.GRAPHQL_URL ?? '';

export const MONGO_DB_URL = process.env.MONGO_DB_URL;
export const JWT_SECRET = process.env.JWT_SECRET;
export const NTLANGO_SECRET_ARN = process.env.NTLANGO_SECRET_ARN;
