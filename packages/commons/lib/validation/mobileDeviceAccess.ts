import { z } from 'zod';
import { MobileDeviceAccessPlatform, MobileDeviceAccessStatus } from '../types';

const optionalTrimmedString = z.string().trim().min(1, { message: 'Value cannot be empty.' }).optional();

export const RegisterMobileDeviceAccessInputSchema = z.object({
  deviceInstallationId: z.string().uuid({ message: 'Device installation ID must be a valid UUID.' }),
  platform: z.nativeEnum(MobileDeviceAccessPlatform),
  appVersion: optionalTrimmedString,
  buildVersion: optionalTrimmedString,
  registrationSecret: z.string().uuid({ message: 'Registration secret must be a valid UUID.' }).optional(),
});

export const ReadMobileDeviceAccessesInputSchema = z.object({
  status: z.nativeEnum(MobileDeviceAccessStatus).optional(),
  search: z.string().trim().max(120, { message: 'Search value is too long.' }).optional(),
});

export const UpdateMobileDeviceAccessStatusInputSchema = z.object({
  deviceInstallationId: z.string().uuid({ message: 'Device installation ID must be a valid UUID.' }),
  status: z.nativeEnum(MobileDeviceAccessStatus),
});
