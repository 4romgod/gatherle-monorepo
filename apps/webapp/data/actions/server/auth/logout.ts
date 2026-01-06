'use server';

import { signOut } from '@/auth';
import { logger } from '@/lib/utils/logger';

export async function logoutUserAction() {
  logger.action('logoutUserAction');
  await signOut();
  logger.info('User logged out successfully');
}
