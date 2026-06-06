import { z } from 'zod';
import { PushSubscriptionPlatform, PushSubscriptionProvider } from '../types';

const EXPO_PUSH_TOKEN_REGEX = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;
const FCM_PUSH_TOKEN_REGEX = /^[A-Za-z0-9:_-]{20,}$/;

function inferPushProvider(input: {
  platform: PushSubscriptionPlatform;
  provider?: PushSubscriptionProvider;
  token: string;
}): PushSubscriptionProvider {
  if (input.provider) {
    return input.provider;
  }

  if (EXPO_PUSH_TOKEN_REGEX.test(input.token)) {
    return PushSubscriptionProvider.Expo;
  }

  if (input.platform === PushSubscriptionPlatform.Android) {
    return PushSubscriptionProvider.Fcm;
  }

  return PushSubscriptionProvider.Expo;
}

export const RegisterPushSubscriptionInputSchema = z
  .object({
    provider: z.nativeEnum(PushSubscriptionProvider).optional(),
    platform: z.nativeEnum(PushSubscriptionPlatform),
    token: z.string().min(1, { message: 'Push token is required.' }),
    deviceInstallationId: z.string().min(1, { message: 'Device installation ID is required.' }),
  })
  .superRefine((input, ctx) => {
    const provider = inferPushProvider(input);

    if (provider === PushSubscriptionProvider.Expo && !EXPO_PUSH_TOKEN_REGEX.test(input.token)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['token'],
        message: 'Push token must be a valid Expo push token.',
      });
    }

    if (provider === PushSubscriptionProvider.Fcm && !FCM_PUSH_TOKEN_REGEX.test(input.token)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['token'],
        message: 'Push token must be a valid Firebase Cloud Messaging token.',
      });
    }
  });
