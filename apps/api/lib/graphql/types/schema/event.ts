import {z} from 'zod';
import {REGEX_DATE} from '../../../constants';
import {EventPrivacySetting, EventStatus} from '../../../utils/validators/../../graphql/types';
import {ERROR_MESSAGES, validateMongodbId} from '../../../utils/validators';

export const CreateEventInputTypeSchema = z.object({
    title: z.string().min(2, {message: `Title ${ERROR_MESSAGES.REQUIRED}`}),
    description: z.string().min(2, {message: `Description ${ERROR_MESSAGES.REQUIRED}`}),
    startDate: z.string().regex(REGEX_DATE, {message: `Start date ${ERROR_MESSAGES.INVALID_DATE}`}),
    endDate: z.string().regex(REGEX_DATE, {message: `End date ${ERROR_MESSAGES.INVALID_DATE}`}),
    location: z.string().min(2, {message: `Location ${ERROR_MESSAGES.REQUIRED}`}),
    status: z.nativeEnum(EventStatus, {message: ERROR_MESSAGES.INVALID_EVENT_STATUS}),
    capacity: z.number().int().positive().nullish().optional(),
    eventCategory: z.array(z.string()).min(1, {message: ERROR_MESSAGES.ATLEAST_ONE('event category')}),
    organizers: z
        .array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`}))
        .min(1, {message: 'At least one organizer is required'}),
    rSVPs: z.array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`})).nullish(),
    tags: z.record(z.any()).nullish(),
    media: z
        .object({
            featuredImageUrl: z.string(),
            otherMediaData: z.record(z.any()).nullish(),
        })
        .nullish(),
    additionalDetails: z.record(z.any()).nullish(),
    comments: z.record(z.any()).nullish().optional(),
    privacySetting: z.nativeEnum(EventPrivacySetting).nullish(),
    eventLink: z.string().nullish(),
});

export const UpdateEventInputTypeSchema = z.object({
    id: z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`}),
    title: z
        .string()
        .min(2, {message: `Title ${ERROR_MESSAGES.REQUIRED}`})
        .nullish(),
    description: z
        .string()
        .min(2, {message: `Description ${ERROR_MESSAGES.REQUIRED}`})
        .nullish(),
    startDate: z
        .string()
        .regex(REGEX_DATE, {message: `Start date ${ERROR_MESSAGES.INVALID_DATE}`})
        .nullish(),
    endDate: z
        .string()
        .regex(REGEX_DATE, {message: `End date ${ERROR_MESSAGES.INVALID_DATE}`})
        .nullish(),
    location: z
        .string()
        .min(2, {message: `Location ${ERROR_MESSAGES.REQUIRED}`})
        .nullish(),
    status: z.nativeEnum(EventStatus, {message: ERROR_MESSAGES.INVALID_EVENT_STATUS}).nullish(),
    capacity: z.number().int().positive().nullish(),
    eventCategory: z
        .array(z.string())
        .min(1, {message: ERROR_MESSAGES.ATLEAST_ONE('event category')})
        .nullish(),
    organizers: z
        .array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`}))
        .min(1, {message: 'At least one organizer is required'})
        .nullish(),
    rSVPs: z.array(z.string().refine(validateMongodbId, {message: `event ID ${ERROR_MESSAGES.INVALID}`})).nullish(),
    tags: z.record(z.any()).nullish(),
    media: z
        .object({
            featuredImageUrl: z.string(),
            otherMediaData: z.record(z.any()).nullish().optional(),
        })
        .nullish(),
    additionalDetails: z.record(z.any()).nullish(),
    comments: z.record(z.any()).nullish(),
    privacySetting: z.nativeEnum(EventPrivacySetting).nullish(),
    eventLink: z.string().nullish(),
});
