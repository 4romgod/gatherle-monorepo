import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const APP_STORAGE_PREFIX = 'gatherle.mobile';

export const DEVICE_STORAGE_KEYS = {
  chatEmojiRecents: `${APP_STORAGE_PREFIX}.chat-emoji-recents`,
  eventsFilters: `${APP_STORAGE_PREFIX}.events-filters`,
  lastOpenChatUsername: `${APP_STORAGE_PREFIX}.last-open-chat-username`,
  tabSelection: `${APP_STORAGE_PREFIX}.tab-selection`,
  themePreference: `${APP_STORAGE_PREFIX}.theme-preference`,
} as const;

function readWebStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function toNativeSecureStoreKey(key: string): string {
  const hexBody = Array.from(key)
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  return `g${hexBody}`;
}

export async function readStoredString(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return readWebStorage()?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(toNativeSecureStoreKey(key));
}

export async function writeStoredString(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    readWebStorage()?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(toNativeSecureStoreKey(key), value);
}

export async function clearStoredString(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    readWebStorage()?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(toNativeSecureStoreKey(key));
}

export async function readStoredJson<T>(key: string): Promise<T | null> {
  const raw = await readStoredString(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    await clearStoredString(key);
    return null;
  }
}

export async function writeStoredJson<T>(key: string, value: T): Promise<void> {
  await writeStoredString(key, JSON.stringify(value));
}
