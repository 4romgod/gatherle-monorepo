import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character' });

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.toISOString().slice(0, 10) === value;
}

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(8, { message: 'Password should be at least 8 characters long' }),
});

export const registerSchema = z.object({
  birthdate: z.string().refine(isValidDateInput, {
    message: 'Birthdate should be in YYYY-MM-DD format',
  }),
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
