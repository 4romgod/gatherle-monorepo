export const featureFlags = {
  enablePrivateUsers: process.env.NEXT_PUBLIC_ENABLE_PRIVATE_USERS === 'true',
} as const;
