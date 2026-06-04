import { z } from 'zod';
import { birthdateInputSchema, passwordSchema } from '@gatherle/commons/client/validation';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(8, { message: 'Password should be at least 8 characters long' }),
});

export const registerSchema = z.object({
  birthdate: birthdateInputSchema,
  email: z.string().email({ message: 'Invalid email format' }),
  family_name: z.string().min(1, { message: 'Last name is required' }),
  given_name: z.string().min(1, { message: 'First name is required' }),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type FieldErrors = Partial<Record<string, string[]>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  return error.flatten().fieldErrors;
}
