import {z} from 'zod';
import mongoose from 'mongoose';
import {VenueType} from '@ntlango/commons/types';
import {ERROR_MESSAGES} from '@/validation';

const mongoIdValidator = (value: string) => mongoose.Types.ObjectId.isValid(value);

const venueAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().min(1, {message: `City ${ERROR_MESSAGES.REQUIRED}`}),
  region: z.string().optional(),
  country: z.string().min(1, {message: `Country ${ERROR_MESSAGES.REQUIRED}`}),
  postalCode: z.string().optional(),
});

const venueGeoSchema = z.object({
  latitude: z
    .number()
    .gte(-90, {message: `Latitude ${ERROR_MESSAGES.INVALID}`})
    .lte(90, {message: `Latitude ${ERROR_MESSAGES.INVALID}`}),
  longitude: z
    .number()
    .gte(-180, {message: `Longitude ${ERROR_MESSAGES.INVALID}`})
    .lte(180, {message: `Longitude ${ERROR_MESSAGES.INVALID}`}),
});

export const CreateVenueInputSchema = z.object({
  orgId: z
    .string()
    .refine(mongoIdValidator, {message: `Organization ID ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  type: z.nativeEnum(VenueType),
  name: z.string().min(2, {message: `Name ${ERROR_MESSAGES.REQUIRED}`}),
  address: venueAddressSchema.optional(),
  geo: venueGeoSchema.optional(),
  url: z
    .string()
    .url({message: `URL ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  capacity: z
    .number()
    .int()
    .positive({message: `Capacity ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  amenities: z.array(z.string()).optional(),
});

export const UpdateVenueInputSchema = z.object({
  venueId: z.string().refine(mongoIdValidator, {message: `Venue ID ${ERROR_MESSAGES.INVALID}`}),
  orgId: z
    .string()
    .refine(mongoIdValidator, {message: `Organization ID ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  type: z.nativeEnum(VenueType).optional(),
  name: z
    .string()
    .min(2, {message: `Name ${ERROR_MESSAGES.TOO_SHORT}`})
    .optional(),
  address: venueAddressSchema.optional(),
  geo: venueGeoSchema.optional(),
  url: z
    .string()
    .url({message: `URL ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  capacity: z
    .number()
    .int()
    .positive({message: `Capacity ${ERROR_MESSAGES.INVALID}`})
    .optional(),
  amenities: z.array(z.string()).optional(),
});
