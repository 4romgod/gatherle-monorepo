import { z } from 'zod';
import mongoose from 'mongoose';
import { SupportRequestKind, SupportRequestStatus } from '@gatherle/commons/server/types';
import { SUPPORT_REQUEST_LIMITS } from '@gatherle/commons/server/constants';

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const CreateSupportRequestInputSchema = z.object({
  kind: z.nativeEnum(SupportRequestKind),
  subject: z
    .string()
    .trim()
    .min(SUPPORT_REQUEST_LIMITS.subjectMinLength, {
      message: `Subject must be at least ${SUPPORT_REQUEST_LIMITS.subjectMinLength} characters long.`,
    })
    .max(SUPPORT_REQUEST_LIMITS.subjectMaxLength, {
      message: `Subject must be ${SUPPORT_REQUEST_LIMITS.subjectMaxLength} characters or fewer.`,
    }),
  message: z
    .string()
    .trim()
    .min(SUPPORT_REQUEST_LIMITS.messageMinLength, {
      message: `Message must be at least ${SUPPORT_REQUEST_LIMITS.messageMinLength} characters long.`,
    })
    .max(SUPPORT_REQUEST_LIMITS.messageMaxLength, {
      message: `Message must be ${SUPPORT_REQUEST_LIMITS.messageMaxLength} characters or fewer.`,
    }),
  screenshotUrl: z.string().trim().url({ message: 'Screenshot URL must be a valid URL.' }).optional(),
  pagePath: optionalTrimmedString(SUPPORT_REQUEST_LIMITS.pagePathMaxLength),
});

export const ReadSupportRequestsInputSchema = z.object({
  status: z.nativeEnum(SupportRequestStatus).optional(),
  search: optionalTrimmedString(SUPPORT_REQUEST_LIMITS.searchMaxLength),
  limit: z.number().int().min(1).max(200).optional(),
});

export const UpdateSupportRequestStatusInputSchema = z.object({
  supportRequestId: z.string().refine(mongoose.Types.ObjectId.isValid, {
    message: 'Support request ID is invalid.',
  }),
  status: z.nativeEnum(SupportRequestStatus),
});
