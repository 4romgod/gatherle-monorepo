import mongoose from 'mongoose';
import {z} from 'zod';
import {FollowStatus, FollowTargetType} from '@ntlango/commons/types/follow';
import {IntentSource, IntentStatus, IntentVisibility} from '@ntlango/commons/types/intent';
import {ActivityObjectType, ActivityVerb, ActivityVisibility} from '@ntlango/commons/types/activity';
import {ERROR_MESSAGES} from '@/validation';

const objectIdSchema = z.string().refine(mongoose.Types.ObjectId.isValid, {message: ERROR_MESSAGES.INVALID}).describe('MongoDB ObjectId');

export const CreateFollowInputSchema = z.object({
  targetType: z.nativeEnum(FollowTargetType),
  targetId: objectIdSchema,
  status: z.nativeEnum(FollowStatus).optional(),
});

export const UpsertIntentInputSchema = z.object({
  intentId: objectIdSchema.optional(),
  eventId: objectIdSchema,
  status: z.nativeEnum(IntentStatus).optional(),
  visibility: z.nativeEnum(IntentVisibility).optional(),
  source: z.nativeEnum(IntentSource).optional(),
  participantId: objectIdSchema.optional(),
  metadata: z.record(z.any()).optional(),
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
