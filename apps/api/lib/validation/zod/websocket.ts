import { z } from 'zod';
import { EventMomentType } from '@gatherle/commons/types';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/websocket/constants';

const MOMENT_CAPTION_MAX_LENGTH = 280;
const TOPIC_PATTERN = /^[a-z0-9._-]+$/i;

export const ChatSendPayloadSchema = z
  .object({
    recipientUserId: z.string().trim().min(1, { message: 'recipientUserId is required.' }),
    message: z
      .string()
      .trim()
      .min(1, { message: 'message is required.' })
      .max(CHAT_MESSAGE_MAX_LENGTH, {
        message: `Message exceeds max length of ${CHAT_MESSAGE_MAX_LENGTH} characters.`,
      }),
    replyToMomentId: z.string().trim().min(1).optional(),
    replyToMomentCaption: z.string().trim().max(MOMENT_CAPTION_MAX_LENGTH).optional(),
    replyToMomentType: z.nativeEnum(EventMomentType).optional(),
  })
  .passthrough();

export const ChatReadPayloadSchema = z
  .object({
    withUserId: z.string().trim().min(1, { message: 'withUserId is required.' }),
  })
  .passthrough();

export const NotificationSubscribePayloadSchema = z
  .object({
    topics: z
      .array(z.string().trim().min(1).max(32).regex(TOPIC_PATTERN, { message: 'Invalid topic name.' }))
      .max(10, { message: 'No more than 10 topics may be subscribed in one request.' })
      .default([]),
  })
  .passthrough();
