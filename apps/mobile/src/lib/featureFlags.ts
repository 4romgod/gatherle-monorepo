export const featureFlags = {
  enablePrivateUsers: process.env.EXPO_PUBLIC_ENABLE_PRIVATE_USERS === 'true',
} as const;
