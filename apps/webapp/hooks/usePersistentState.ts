import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { SaveSessionStateDocument } from '@/data/graphql/mutation/SessionState/mutation';
import { ReadSessionStateDocument } from '@/data/graphql/query/SessionState/query';
import { getAuthHeader } from '@/lib/utils/auth';

export type StorageType = 'localStorage' | 'sessionStorage';

const DEFAULT_NAMESPACE = 'ntlango:sessionstate';
const DEFAULT_STORAGE: StorageType = 'localStorage';
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

export interface PersistentStateOptions<T = any> {
  namespace?: string;
  userId?: string;
  storageType?: StorageType;
  ttl?: number; // milliseconds
  disabled?: boolean;
  serialize?: (value: T) => any;
  deserialize?: (value: any) => T;
  syncToBackend?: boolean; // Enable backend sync for cross-device continuity
  token?: string; // JWT token for authenticated requests
  onSyncError?: (error: Error, attempt: number) => void; // Callback for sync errors
  maxRetries?: number; // Maximum retry attempts (default: 3)
}

interface PersistedValue<T> {
  value: T;
  expiresAt?: number;
}

interface UsePersistentStateReturn<T> {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  isHydrated: boolean;
  clearStorage: () => void;
  storageKey: string;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  syncError: Error | null;
  retrySync: () => void;
}

const getStorage = (storageType: StorageType): Storage | null => {
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

const buildStorageKey = (key: string, namespace: string, userId?: string) => {
  const prefix = userId ? `${namespace}:${userId}` : namespace;
  return `${prefix}:${key}`;
};

// Exponential backoff with jitter
const calculateRetryDelay = (attempt: number): number => {
  const exponentialDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return exponentialDelay + jitter;
};

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const usePersistentState = <T>(
  key: string,
  defaultValue: T | (() => T),
  options?: PersistentStateOptions<T>,
): UsePersistentStateReturn<T> => {
  const namespace = options?.namespace ?? DEFAULT_NAMESPACE;
  const userId = options?.userId;
  const storageType = options?.storageType ?? DEFAULT_STORAGE;
  const ttl = options?.ttl;
  const isEnabled = !options?.disabled;
  const syncToBackend = options?.syncToBackend ?? false;
  const token = options?.token;
  const maxRetries = options?.maxRetries ?? MAX_RETRY_ATTEMPTS;
  const onSyncError = options?.onSyncError;

  // Track sync state and errors
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [syncError, setSyncError] = useState<Error | null>(null);
  const pendingSyncRef = useRef<{ key: string; value: any; attempt: number } | null>(null);
  const isMountedRef = useRef(true);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track mount state and cleanup timers on unmount
  useLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  // GraphQL hooks for backend sync (only active when syncToBackend is true)
  const { data: backendData, loading: backendLoading } = useQuery(ReadSessionStateDocument, {
    variables: { key },
    skip: !syncToBackend || !token || !userId,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-first',
  });

  const [saveToBackend] = useMutation(SaveSessionStateDocument, {
    context: { headers: getAuthHeader(token) },
  });

  // Use refs to store serialize/deserialize functions to avoid recreating readFromStorage
  const serializeRef = useRef(options?.serialize ?? ((v: T) => v));
  const deserializeRef = useRef(options?.deserialize ?? ((serializedValue: any) => serializedValue as T));

  // Update refs when options change
  useLayoutEffect(() => {
    serializeRef.current = options?.serialize ?? ((v: T) => v);
    deserializeRef.current = options?.deserialize ?? ((serializedValue: any) => serializedValue as T);
  }, [options?.serialize, options?.deserialize]);

  const defaultValueRef = useRef<T>(typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue);

  useLayoutEffect(() => {
    defaultValueRef.current = typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
  }, [defaultValue]);

  const storageKey = useMemo(() => buildStorageKey(key, namespace, userId), [key, namespace, userId]);

  const readFromStorage = useCallback((): T | null => {
    if (!isEnabled) {
      return null;
    }

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
      return deserializeRef.current(parsed.value);
    } catch (error) {
      storage.removeItem(storageKey);
      console.warn('usePersistentState: Failed to parse persisted value', error);
      return null;
    }
  }, [isEnabled, storageKey, storageType]);

  const [value, setValue] = useState<T>(() => {
    // Always start with localStorage or default (instant)
    const storedValue = readFromStorage();
    return storedValue !== null ? storedValue : defaultValueRef.current;
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate immediately from localStorage (instant UX)
  useLayoutEffect(() => {
    if (!isEnabled) {
      setIsHydrated(true);
      return;
    }

    const storedValue = readFromStorage();
    if (storedValue !== null) {
      setValue(storedValue);
    } else {
      setValue(defaultValueRef.current);
    }
    setIsHydrated(true);
  }, [isEnabled, storageKey, storageType]);

  // Sync from backend in background (when available)
  useLayoutEffect(() => {
    if (!syncToBackend || !backendData?.readSessionState || backendLoading) {
      return;
    }

    // Update from backend if data exists
    const backendValue = deserializeRef.current(backendData.readSessionState.value);
    setValue(backendValue);

    // Also update localStorage cache to match backend
    if (isEnabled) {
      const storage = getStorage(storageType);
      if (storage) {
        const payload: PersistedValue<any> = { value: serializeRef.current(backendValue) };
        if (ttl && ttl > 0) {
          payload.expiresAt = Date.now() + ttl;
        }
        try {
          storage.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
          console.warn('usePersistentState: Failed to update localStorage from backend', error);
        }
      }
    }
  }, [syncToBackend, backendData, backendLoading, isEnabled, storageKey, storageType, ttl]);

  // Retry sync with exponential backoff
  const retrySync = useCallback(async () => {
    if (!pendingSyncRef.current || !syncToBackend || !token || !userId || !isMountedRef.current) {
      return;
    }

    const { key: syncKey, value: syncValue, attempt } = pendingSyncRef.current;

    if (attempt >= maxRetries) {
      const error = new Error(`Failed to sync after ${maxRetries} attempts`);
      if (isMountedRef.current) {
        setSyncError(error);
        setSyncStatus('error');
      }
      onSyncError?.(error, attempt);
      pendingSyncRef.current = null;
      return;
    }

    const delay = calculateRetryDelay(attempt);
    await sleep(delay);

    // Check if still mounted after sleep
    if (!isMountedRef.current) {
      return;
    }

    try {
      setSyncStatus('syncing');
      await saveToBackend({
        variables: {
          input: {
            key: syncKey,
            value: syncValue,
            version: 1,
          },
        },
      });

      if (isMountedRef.current) {
        setSyncStatus('success');
        setSyncError(null);
      }
      pendingSyncRef.current = null;
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Unknown sync error');
      console.warn(`usePersistentState: Retry ${attempt + 1}/${maxRetries} failed`, syncError);

      pendingSyncRef.current = {
        key: syncKey,
        value: syncValue,
        attempt: attempt + 1,
      };

      onSyncError?.(syncError, attempt + 1);

      // Auto-retry if not exhausted and still mounted
      if (attempt + 1 < maxRetries && isMountedRef.current) {
        retryTimerRef.current = setTimeout(() => retrySync(), 0);
      } else if (isMountedRef.current) {
        setSyncError(syncError);
        setSyncStatus('error');
      }
    }
  }, [syncToBackend, token, userId, maxRetries, saveToBackend, onSyncError]);

  const persistValue = useCallback(
    (nextValue: React.SetStateAction<T>) => {
      setValue((prevState) => {
        const resolved = typeof nextValue === 'function' ? (nextValue as (prevState: T) => T)(prevState) : nextValue;

        if (isEnabled) {
          // Write to localStorage first (synchronous, fast)
          const storage = getStorage(storageType);
          if (storage) {
            const payload: PersistedValue<any> = { value: serializeRef.current(resolved) };
            if (ttl && ttl > 0) {
              payload.expiresAt = Date.now() + ttl;
            }
            try {
              storage.setItem(storageKey, JSON.stringify(payload));
            } catch (error) {
              console.warn('usePersistentState: Failed to persist value to localStorage', error);
            }
          }

          // Async write to backend with retry logic
          if (syncToBackend && token && userId) {
            const serializedValue = serializeRef.current(resolved);

            setSyncStatus('syncing');
            saveToBackend({
              variables: {
                input: {
                  key,
                  value: serializedValue,
                  version: 1,
                },
              },
            })
              .then(() => {
                if (isMountedRef.current) {
                  setSyncStatus('success');
                  setSyncError(null);
                  pendingSyncRef.current = null;
                }
              })
              .catch((error) => {
                const syncError = error instanceof Error ? error : new Error('Unknown sync error');
                console.warn('usePersistentState: Initial backend sync failed, will retry', syncError);

                // Store pending sync for retry
                pendingSyncRef.current = {
                  key,
                  value: serializedValue,
                  attempt: 0,
                };

                onSyncError?.(syncError, 0);

                // Trigger first retry if still mounted
                if (isMountedRef.current) {
                  retryTimerRef.current = setTimeout(() => retrySync(), 0);
                }
              });
          }
        }

        return resolved;
      });
    },
    [isEnabled, storageKey, storageType, ttl, syncToBackend, token, userId, key, saveToBackend, onSyncError, retrySync],
  );

  const clearStorage = useCallback(() => {
    if (isEnabled) {
      const storage = getStorage(storageType);
      if (storage) {
        storage.removeItem(storageKey);
      }
    }
    setValue(defaultValueRef.current);
    setSyncStatus('idle');
    setSyncError(null);
    pendingSyncRef.current = null;
  }, [isEnabled, storageKey, storageType]);

  return {
    value,
    setValue: persistValue,
    isHydrated,
    clearStorage,
    storageKey,
    syncStatus,
    syncError,
    retrySync,
  };
};
