import {z} from 'zod';
import mongoose from 'mongoose';
import {EventVisibility, OrganizationTicketAccess} from '@ntlango/commons/types';
import {ERROR_MESSAGES} from '@/validation';

const mongoIdValidator = (value: string) => mongoose.Types.ObjectId.isValid(value);

const organizationLinkSchema = z.object({
  label: z.string().min(1, {message: `Link label ${ERROR_MESSAGES.REQUIRED}`}),
  url: z.string().url({message: `Link URL ${ERROR_MESSAGES.INVALID}`}),
});

const eventDefaultsSchema = z.object({
  visibility: z.nativeEnum(EventVisibility).optional(),
  remindersEnabled: z.boolean().optional(),
  waitlistEnabled: z.boolean().optional(),
  allowGuestPlusOnes: z.boolean().optional(),
  ticketAccess: z.nativeEnum(OrganizationTicketAccess).optional(),
});

const domainSchema = z
  .string()
  .min(3, {message: `Domain ${ERROR_MESSAGES.INVALID}`})
  .describe('Domain that is allowed to create content for the organization');

export const CreateOrganizationInputSchema = z.object({
  name: z.string().min(2, {message: `Name ${ERROR_MESSAGES.REQUIRED}`}),
  description: z.string().optional(),
  logo: z
    .string()
    .url({message: `Logo ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  ownerId: z.string().refine(mongoIdValidator, {message: `Owner ID ${ERROR_MESSAGES.INVALID}`}),
  defaultVisibility: z.nativeEnum(EventVisibility).optional(),
  billingEmail: z
    .string()
    .email({message: `Billing Email ${ERROR_MESSAGES.INVALID_EMAIL}`})
    .optional(),
  links: z.array(organizationLinkSchema).optional(),
  domainsAllowed: z.array(domainSchema).optional(),
  eventDefaults: eventDefaultsSchema.optional(),
  allowedTicketAccess: z.nativeEnum(OrganizationTicketAccess),
  tags: z.array(z.string()).optional(),
});

const updatableOrganizationFields = z.object({
  name: z
    .string()
    .min(2, {message: `Name ${ERROR_MESSAGES.TOO_SHORT}`})
    .optional(),
  description: z.string().optional(),
  logo: z
    .string()
    .url({message: `Logo ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  defaultVisibility: z.nativeEnum(EventVisibility).optional(),
  billingEmail: z
    .string()
    .email({message: `Billing Email ${ERROR_MESSAGES.INVALID_EMAIL}`})
    .optional(),
  links: z.array(organizationLinkSchema).optional(),
  domainsAllowed: z.array(domainSchema).optional(),
  eventDefaults: eventDefaultsSchema.optional(),
  allowedTicketAccess: z.nativeEnum(OrganizationTicketAccess).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateOrganizationInputSchema = z
  .object({
    orgId: z.string().refine(mongoIdValidator, {message: `Organization ID ${ERROR_MESSAGES.INVALID}`}),
  })
  .merge(updatableOrganizationFields)
  .refine(
    (data) => {
      const {orgId, ...rest} = data;
      return Object.values(rest).some((value) => typeof value !== 'undefined');
    },
    {message: 'At least one field must be updated'},
  );
