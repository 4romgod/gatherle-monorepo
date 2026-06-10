import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { isAppAccessBlockedError } from './app-access-block';

export function redirectIfAppAccessBlocked(error: unknown): void {
  if (isAppAccessBlockedError(error)) {
    redirect(ROUTES.ACCOUNT_BLOCKED);
  }
}
