import { ERROR_MESSAGES } from '@gatherle/commons/client/constants';

type AppAccessBlockedListener = (message: string) => void;

const listeners = new Set<AppAccessBlockedListener>();

export function notifyAppAccessBlocked(message?: string | null): void {
  const resolvedMessage = message?.trim() || ERROR_MESSAGES.APP_ACCESS_BLOCKED;
  listeners.forEach((listener) => listener(resolvedMessage));
}

export function subscribeToAppAccessBlocked(listener: AppAccessBlockedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
