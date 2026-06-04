import { STORAGE_NAMESPACES } from '@/hooks/usePersistentState/constants';
import { APP_NAMESPACE } from '@/lib/constants/app';
import { logger } from './logger';

const LOGOUT_STORAGE_PREFIXES = [
  `${APP_NAMESPACE}:`,
  `${STORAGE_NAMESPACES.FILTERS}:`,
  `${STORAGE_NAMESPACES.LOCATION}:`,
  `${STORAGE_NAMESPACES.EVENT_MUTATION}:`,
  `${STORAGE_NAMESPACES.VENUE_MUTATION}:`,
] as const;

const clearMatchingStorageKeys = (storage: Storage | null, storageType: 'localStorage' | 'sessionStorage') => {
  if (!storage) {
    return;
  }

  try {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) {
        continue;
      }

      if (LOGOUT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch (error) {
    logger.warn(`Failed to clear ${storageType} during logout`, error);
  }
};

export const clearLogoutBrowserState = () => {
  if (typeof window === 'undefined') {
    return;
  }

  clearMatchingStorageKeys(window.localStorage, 'localStorage');
  clearMatchingStorageKeys(window.sessionStorage, 'sessionStorage');
};
