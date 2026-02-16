import type { Dispatch, SetStateAction } from 'react';

export type StorageType = 'localStorage' | 'sessionStorage';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export interface PersistentStateOptions<T = any> {
  namespace?: string;
  userId?: string;
  storageType?: StorageType;
  ttl?: number;
  disabled?: boolean;
  serialize?: (value: T) => any;
  deserialize?: (value: any) => T;
  syncToBackend?: boolean;
  token?: string;
  onSyncError?: (error: Error, attempt: number) => void;
  maxRetries?: number;
}

export interface UsePersistentStateReturn<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  isHydrated: boolean;
  clearStorage: () => void;
  storageKey: string;
  syncStatus: SyncStatus;
  syncError: Error | null;
  retrySync: () => void;
}

export interface PersistedValue<T> {
  value: T;
  expiresAt?: number;
}

export interface PendingSyncPayload {
  key: string;
  value: any;
  attempt: number;
}
