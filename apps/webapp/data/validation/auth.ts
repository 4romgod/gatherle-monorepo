import { z } from 'zod';

const InputMaybe = z.union([z.string(), z.undefined()]);

export const CreateUserInputTypeSchema = z.object({
  // address: z.string().min(2, { message: 'Address is required' }),
  birthdate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Birthdate should be in DD/MM/YYYY format' }),
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
