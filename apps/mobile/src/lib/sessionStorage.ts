import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_STORAGE_KEY = 'gatherle.mobile.session';

export type StoredAuthSession = {
  email: string;
  token: string;
  username: string | null;
};

function readWebStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export async function readStoredSession(): Promise<StoredAuthSession | null> {
  const serializedValue =
    Platform.OS === 'web'
      ? (readWebStorage()?.getItem(SESSION_STORAGE_KEY) ?? null)
      : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

  if (!serializedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(serializedValue) as StoredAuthSession;

    if (!parsed?.token || !parsed?.email) {
      return null;
    }

    return {
      email: parsed.email,
      token: parsed.token,
      username: parsed.username ?? null,
    };
  } catch {
    return null;
  }
}

export async function writeStoredSession(session: StoredAuthSession): Promise<void> {
  const serializedValue = JSON.stringify(session);

  if (Platform.OS === 'web') {
    readWebStorage()?.setItem(SESSION_STORAGE_KEY, serializedValue);
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, serializedValue);
}

export async function clearStoredSession(): Promise<void> {
  if (Platform.OS === 'web') {
    readWebStorage()?.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
