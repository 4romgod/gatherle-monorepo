import {z} from 'zod';
import {REGEX_DATE} from '@/constants';
import {EventPrivacySetting, EventStatus} from '@/graphql/types';
import {ERROR_MESSAGES, validateMongodbId} from '@/utils/validators';

export const CreateEventInputTypeSchema = z.object({
    title: z.string().min(2, {message: `Title ${ERROR_MESSAGES.REQUIRED}`}),
    description: z.string().min(2, {message: `Description ${ERROR_MESSAGES.REQUIRED}`}),
    startDate: z.string().regex(REGEX_DATE, {message: `Start date ${ERROR_MESSAGES.INVALID_DATE}`}),
    endDate: z.string().regex(REGEX_DATE, {message: `End date ${ERROR_MESSAGES.INVALID_DATE}`}),
    location: z.string().min(2, {message: `Location ${ERROR_MESSAGES.REQUIRED}`}),
    status: z.nativeEnum(EventStatus, {message: ERROR_MESSAGES.INVALID_EVENT_STATUS}),
    capacity: z.number().int().positive().optional(),
    eventCategory: z.array(z.string()).min(1, {message: ERROR_MESSAGES.ATLEAST_ONE('event category')}),
    organizers: z
        .array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`}))
        .min(1, {message: 'At least one organizer is required'}),
    rSVPs: z.array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`})).optional(),
    tags: z.record(z.any()).optional(),
    media: z
        .object({
            featuredImageUrl: z.string(),
            otherMediaData: z.record(z.any()).optional(),
        })
        .optional(),
    additionalDetails: z.record(z.any()).optional(),
    comments: z.record(z.any()).optional(),
    privacySetting: z.nativeEnum(EventPrivacySetting).optional(),
    eventLink: z.string().optional(),
});

export const UpdateEventInputTypeSchema = z.object({
    id: z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`}),
    title: z
        .string()
        .min(2, {message: `Title ${ERROR_MESSAGES.REQUIRED}`})
        .optional(),
    description: z
        .string()
        .min(2, {message: `Description ${ERROR_MESSAGES.REQUIRED}`})
        .optional(),
    startDate: z
        .string()
        .regex(REGEX_DATE, {message: `Start date ${ERROR_MESSAGES.INVALID_DATE}`})
        .optional(),
    endDate: z
        .string()
        .regex(REGEX_DATE, {message: `End date ${ERROR_MESSAGES.INVALID_DATE}`})
        .optional(),
    location: z
        .string()
        .min(2, {message: `Location ${ERROR_MESSAGES.REQUIRED}`})
        .optional(),
    status: z.nativeEnum(EventStatus, {message: ERROR_MESSAGES.INVALID_EVENT_STATUS}).optional(),
    capacity: z.number().int().positive().optional(),
    eventCategory: z
        .array(z.string())
        .min(1, {message: ERROR_MESSAGES.ATLEAST_ONE('event category')})
        .optional(),
    organizers: z
        .array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`}))
        .min(1, {message: 'At least one organizer is required'})
        .optional(),
    rSVPs: z.array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`})).optional(),
    tags: z.record(z.any()).optional(),
    media: z
        .object({
            featuredImageUrl: z.string(),
            otherMediaData: z.record(z.any()).optional(),
        })
        .optional(),
    additionalDetails: z.record(z.any()).optional(),
    comments: z.record(z.any()).optional(),
    privacySetting: z.nativeEnum(EventPrivacySetting).optional(),
    eventLink: z.string().optional(),
});
