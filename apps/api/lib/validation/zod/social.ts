import mongoose from 'mongoose';
import { z } from 'zod';
import { FollowTargetType } from '@gatherle/commons/types/follow';
import { ActivityObjectType, ActivityVerb, ActivityVisibility } from '@gatherle/commons/types/activity';
import { EventMomentType } from '@gatherle/commons/types/eventMoment';
import { ERROR_MESSAGES } from '@/validation';

const objectIdSchema = z
  .string()
  .refine(mongoose.Types.ObjectId.isValid, { message: ERROR_MESSAGES.INVALID })
  .describe('MongoDB ObjectId');

export const CreateFollowInputSchema = z.object({
  targetType: z.nativeEnum(FollowTargetType),
  targetId: objectIdSchema,
});

export const CreateActivityInputSchema = z.object({
  verb: z.nativeEnum(ActivityVerb),
  objectType: z.nativeEnum(ActivityObjectType),
  objectId: objectIdSchema,
  targetType: z.nativeEnum(ActivityObjectType).optional(),
  targetId: objectIdSchema.optional(),
  visibility: z.nativeEnum(ActivityVisibility).optional(),
  eventAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export const CreateEventMomentInputSchema = z
  .object({
    momentId: z.string().min(1).optional(),
    eventId: objectIdSchema,
    type: z.nativeEnum(EventMomentType),
    caption: z.string().max(280, 'Caption must be 280 characters or fewer').optional(),
    mediaKey: z.string().optional(),
    thumbnailKey: z.string().optional(),
    background: z
      .enum([
        'bg-purple-600',
        'bg-blue-600',
        'bg-green-600',
        'bg-red-600',
        'bg-orange-500',
        'bg-pink-600',
        'bg-indigo-600',
        'bg-teal-600',
        'bg-yellow-400',
        'bg-cyan-500',
      ])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === EventMomentType.Text && !data.caption?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Caption is required for text moments',
        path: ['caption'],
      });
    }
    if (data.type === EventMomentType.Image && !data.mediaKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'mediaKey is required for image moments',
        path: ['mediaKey'],
      });
    }
    if (data.type === EventMomentType.Video && !data.momentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'momentId is required for video moments',
        path: ['momentId'],
      });
    }
    if (data.type === EventMomentType.Video && !data.mediaKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'mediaKey is required for video moments',
        path: ['mediaKey'],
      });
    }
  });
