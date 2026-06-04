'use server';

import { signOut } from '@/auth';
import { logger } from '@/lib/utils/logger';

export async function logoutUserAction(redirectTo?: string) {
  logger.action('logoutUserAction');
  await signOut({ redirect: false, redirectTo });
  logger.info('User logged out successfully');
}
