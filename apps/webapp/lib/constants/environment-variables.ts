import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_JWT_SECRET: z.string(),
  NEXT_PUBLIC_GRAPHQL_URL: z
    .string({ required_error: 'NEXT_PUBLIC_GRAPHQL_URL is required' })
    .url('NEXT_PUBLIC_GRAPHQL_URL must be a valid URL'),
});

export const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET ?? '';
export const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? '';
