import type { PersistedValue, StorageType } from './types';

export const getStorage = (storageType: StorageType): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[storageType];
  } catch (error) {
    console.warn('usePersistentState: Unable to access storage', error);
    return null;
  }
};

export const buildStorageKey = (key: string, namespace: string, userId?: string) => {
  const prefix = userId ? `${namespace}:${userId}` : namespace;
  return `${prefix}:${key}`;
};

interface ReadPersistedValueParams<T> {
  storageType: StorageType;
  storageKey: string;
  deserialize: (value: any) => T;
}

export const readPersistedValue = <T>({
  storageType,
  storageKey,
  deserialize,
}: ReadPersistedValueParams<T>): T | null => {
  const storage = getStorage(storageType);
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedValue<any>;
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      storage.removeItem(storageKey);
      return null;
    }

    return deserialize(parsed.value);
  } catch (error) {
    storage.removeItem(storageKey);
    console.warn('usePersistentState: Failed to parse persisted value', error);
    return null;
  }
};

interface WritePersistedValueParams<T> {
  storageType: StorageType;
  storageKey: string;
  value: T;
  serialize: (value: T) => any;
  ttl?: number;
  errorMessage: string;
}

export const writePersistedValue = <T>({
  storageType,
  storageKey,
  value,
  serialize,
  ttl,
  errorMessage,
}: WritePersistedValueParams<T>) => {
  const storage = getStorage(storageType);
  if (!storage) {
    return;
  }

  const payload: PersistedValue<any> = { value: serialize(value) };
  if (ttl && ttl > 0) {
    payload.expiresAt = Date.now() + ttl;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    console.warn(errorMessage, error);
  }
};

export const clearPersistedValue = (storageType: StorageType, storageKey: string) => {
  const storage = getStorage(storageType);
  if (!storage) {
    return;
  }

  storage.removeItem(storageKey);
};
