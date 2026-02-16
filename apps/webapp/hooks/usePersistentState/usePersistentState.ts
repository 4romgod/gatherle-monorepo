import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { SaveSessionStateDocument } from '@/data/graphql/mutation/SessionState/mutation';
import { ReadSessionStateDocument } from '@/data/graphql/query/SessionState/query';
import { getAuthHeader } from '@/lib/utils/auth';
import { DEFAULT_NAMESPACE, DEFAULT_STORAGE, MAX_RETRY_ATTEMPTS } from './constants';
import { calculateRetryDelay, sleep } from './retry';
import { buildStorageKey, clearPersistedValue, readPersistedValue, writePersistedValue } from './storage';
import type { PendingSyncPayload, PersistentStateOptions, SyncStatus, UsePersistentStateReturn } from './types';

/**
 * React hook that manages state persisted across sessions, with optional backend synchronization
 * and automatic retry handling for failed sync attempts.
 *
 * The hook:
 * - Persists values in the configured storage (e.g. `localStorage`) under a namespaced key.
 * - Optionally synchronizes the value with a backend session-state API when `syncToBackend` is enabled.
 * - Retries failed backend sync operations using an exponential backoff strategy up to `maxRetries`.
 * @remarks
 * Backend synchronization is performed via GraphQL operations defined by `ReadSessionStateDocument`
 * and `SaveSessionStateDocument`. When `syncToBackend` is disabled or either `token` or `userId` is missing,
 * these network operations are skipped and the hook only uses client-side storage.
 *
 * Failed sync attempts are retried using a backoff delay computed by {@link calculateRetryDelay}. Retries
 * are capped by `maxRetries` and are automatically cancelled when the component using this hook unmounts.
 */
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

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<Error | null>(null);
  const pendingSyncRef = useRef<PendingSyncPayload | null>(null);
  const isMountedRef = useRef(true);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const { data: backendData, loading: backendLoading } = useQuery(ReadSessionStateDocument, {
    variables: { key },
    skip: !syncToBackend || !token || !userId,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-first',
  });

  const [saveToBackend] = useMutation(SaveSessionStateDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const serializeRef = useRef(options?.serialize ?? ((v: T) => v));
  const deserializeRef = useRef(options?.deserialize ?? ((serializedValue: any) => serializedValue as T));

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

    return readPersistedValue({
      storageType,
      storageKey,
      deserialize: deserializeRef.current,
    });
  }, [isEnabled, storageKey, storageType]);

  const [value, setValue] = useState<T>(() => {
    const storedValue = readFromStorage();
    return storedValue !== null ? storedValue : defaultValueRef.current;
  });
  const [isHydrated, setIsHydrated] = useState(false);

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

  useLayoutEffect(() => {
    if (!syncToBackend || !backendData?.readSessionState || backendLoading) {
      return;
    }

    const backendValue = deserializeRef.current(backendData.readSessionState.value);
    setValue(backendValue);

    if (isEnabled) {
      writePersistedValue({
        storageType,
        storageKey,
        value: backendValue,
        serialize: serializeRef.current,
        ttl,
        errorMessage: 'usePersistentState: Failed to update localStorage from backend',
      });
    }
  }, [syncToBackend, backendData, backendLoading, isEnabled, storageKey, storageType, ttl]);

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
      const syncErrorValue = error instanceof Error ? error : new Error('Unknown sync error');
      console.warn(`usePersistentState: Retry ${attempt + 1}/${maxRetries} failed`, syncErrorValue);

      pendingSyncRef.current = {
        key: syncKey,
        value: syncValue,
        attempt: attempt + 1,
      };

      onSyncError?.(syncErrorValue, attempt + 1);

      if (attempt + 1 < maxRetries && isMountedRef.current) {
        retryTimerRef.current = setTimeout(() => retrySync(), 0);
      } else if (isMountedRef.current) {
        setSyncError(syncErrorValue);
        setSyncStatus('error');
      }
    }
  }, [syncToBackend, token, userId, maxRetries, saveToBackend, onSyncError]);

  const persistValue = useCallback(
    (nextValue: SetStateAction<T>) => {
      setValue((prevState) => {
        const resolved = typeof nextValue === 'function' ? (nextValue as (prevState: T) => T)(prevState) : nextValue;

        if (isEnabled) {
          writePersistedValue({
            storageType,
            storageKey,
            value: resolved,
            serialize: serializeRef.current,
            ttl,
            errorMessage: 'usePersistentState: Failed to persist value to localStorage',
          });

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
                const syncErrorValue = error instanceof Error ? error : new Error('Unknown sync error');
                console.warn('usePersistentState: Initial backend sync failed, will retry', syncErrorValue);

                pendingSyncRef.current = {
                  key,
                  value: serializedValue,
                  attempt: 0,
                };

                onSyncError?.(syncErrorValue, 0);

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
      clearPersistedValue(storageType, storageKey);
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
