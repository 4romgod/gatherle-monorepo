import { z } from 'zod';
import { isValid, parseISO } from 'date-fns'; // TODO replace with datejs???

const InputMaybe = z.union([z.string(), z.undefined()]);

export const CreateUserInputTypeSchema = z.object({
  // address: z.string().min(2, { message: 'Address is required' }),
  birthdate: z.string().refine(date => isValid(parseISO(date)), {
    message: 'Birthdate should be in YYYY-MM-DD format',
  }),
  email: z.string().email({ message: 'Invalid email format' }),
  family_name: z.string().min(1, { message: 'Last name is required' }),
  given_name: z.string().min(1, { message: 'First name is required' }),
  password: z.string().min(8, { message: 'Password should be at least 8 characters long' }),
  phone_number: InputMaybe,
  profile_picture: InputMaybe,
  username: InputMaybe,
});

export const LoginUserInputTypeSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(8, { message: 'Password should be at least 8 characters long' }),
});

export const ForgotPasswordInputTypeSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
});

export const ResetPasswordInputTypeSchema = z.object({
  password: z.string().min(8, { message: 'Password should be at least 8 characters long' }),
  'confirm-password': z.string().min(8, { message: 'Password should be at least 8 characters long' }),
});
