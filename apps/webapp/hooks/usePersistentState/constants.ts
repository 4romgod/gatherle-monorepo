import type { StorageType } from './types';

export const DEFAULT_NAMESPACE = 'ntlango:sessionstate';
export const DEFAULT_STORAGE: StorageType = 'localStorage';
export const MAX_RETRY_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY_MS = 1000;
export const MAX_RETRY_DELAY_MS = 10000;
