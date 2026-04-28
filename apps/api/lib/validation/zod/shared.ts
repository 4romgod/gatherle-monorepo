import { z } from 'zod';

export const OccurrenceIdSchema = z
  .string()
  .min(1, { message: 'Occurrence ID is required' })
  .refine((value) => {
    const separatorIndex = value.indexOf('#');
    if (separatorIndex <= 0) {
      return false;
    }

    const originalStartAt = new Date(value.slice(separatorIndex + 1));
    return !Number.isNaN(originalStartAt.getTime());
  }, 'Occurrence ID must follow the <eventSeriesId>#<ISO date> format');
