import { z } from 'zod';
import { OccurrenceIdSchema } from './shared';

const OptionalStartAtSchema = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : new Date(value as string | number | Date)),
  z.date().optional(),
);

const OptionalNullableEndAtSchema = z.preprocess(
  (value) => (value === undefined || value === null ? value : new Date(value as string | number | Date)),
  z.union([z.date(), z.null()]).optional(),
);

const TimezoneSchema = z
  .string()
  .min(1, { message: 'Timezone is required' })
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Timezone must be a valid IANA timezone identifier' },
  );

const OptionalTimezoneSchema = z.preprocess((value) => (value === null ? undefined : value), TimezoneSchema.optional());

export const UpdateEventOccurrenceInputSchema = z
  .object({
    occurrenceId: OccurrenceIdSchema.describe('The occurrence identifier to update.'),
    startAt: OptionalStartAtSchema.describe('Updated start date/time for this occurrence.'),
    endAt: OptionalNullableEndAtSchema.describe('Updated end date/time for this occurrence.'),
    timezone: OptionalTimezoneSchema.describe('Updated timezone for this occurrence.'),
  })
  .superRefine((data, ctx) => {
    if (data.startAt === undefined && data.endAt === undefined && data.timezone === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one occurrence field must be provided for update.',
      });
    }

    if (data.startAt instanceof Date && data.endAt instanceof Date && data.endAt.getTime() < data.startAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Occurrence endAt must be later than or equal to startAt.',
        path: ['endAt'],
      });
    }
  });

export const CancelEventOccurrenceInputSchema = z.object({
  occurrenceId: OccurrenceIdSchema.describe('The occurrence identifier to cancel.'),
});
