import {z} from 'zod';
import mongoose from 'mongoose';
import {OrganizationRole} from '@ntlango/commons/types';
import {ERROR_MESSAGES} from '@/validation';

const mongoIdValidator = (value: string) => mongoose.Types.ObjectId.isValid(value);

export const CreateOrganizationMembershipInputSchema = z.object({
  orgId: z.string().refine(mongoIdValidator, {message: `Organization ID ${ERROR_MESSAGES.INVALID}`}),
  userId: z.string().refine(mongoIdValidator, {message: `User ID ${ERROR_MESSAGES.INVALID}`}),
  role: z.nativeEnum(OrganizationRole),
});

export const UpdateOrganizationMembershipInputSchema = z
  .object({
    membershipId: z.string().refine(mongoIdValidator, {message: `Membership ID ${ERROR_MESSAGES.INVALID}`}),
    role: z.nativeEnum(OrganizationRole).optional(),
  })
  .refine((data) => typeof data.role !== 'undefined', {message: 'Role is required for updates'});

export const DeleteOrganizationMembershipInputSchema = z.object({
  membershipId: z.string().refine(mongoIdValidator, {message: `Membership ID ${ERROR_MESSAGES.INVALID}`}),
});
