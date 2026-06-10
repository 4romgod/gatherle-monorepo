import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import {
  GATHERLE_APP_VERSION_HEADER,
  GATHERLE_BUILD_VERSION_HEADER,
  GATHERLE_CLIENT_PLATFORM_HEADER,
  GATHERLE_CLIENT_PLATFORM_MOBILE,
  GATHERLE_DEVICE_INSTALLATION_ID_HEADER,
} from '@gatherle/commons/client/constants';
import { MobileDeviceAccessPlatform } from '@data/graphql/types/graphql';
import { DEVICE_STORAGE_KEYS, readStoredString, writeStoredString } from '@/lib/deviceStorage';

let deviceInstallationIdPromise: Promise<string> | null = null;

export async function getOrCreateDeviceInstallationId(): Promise<string> {
  if (deviceInstallationIdPromise) {
    return deviceInstallationIdPromise;
  }

  deviceInstallationIdPromise = (async () => {
    try {
      const existingInstallationId = await readStoredString(DEVICE_STORAGE_KEYS.appInstallationId);
      if (existingInstallationId) {
        return existingInstallationId;
      }

      const nextInstallationId = Crypto.randomUUID();
      await writeStoredString(DEVICE_STORAGE_KEYS.appInstallationId, nextInstallationId);
      return nextInstallationId;
    } catch (error) {
      deviceInstallationIdPromise = null;
      throw error;
    }
  })();

  return deviceInstallationIdPromise;
}

export function resolveNativeMobileDevicePlatform(): MobileDeviceAccessPlatform | null {
  if (Platform.OS === 'android') {
    return MobileDeviceAccessPlatform.Android;
  }

  if (Platform.OS === 'ios') {
    return MobileDeviceAccessPlatform.Ios;
  }

  return null;
}

export function readNativeBuildMetadata(): { appVersion?: string; buildVersion?: string } {
  const appVersion = Application.nativeApplicationVersion?.trim() || undefined;
  const buildVersion = Application.nativeBuildVersion?.trim() || undefined;

  return {
    ...(appVersion ? { appVersion } : {}),
    ...(buildVersion ? { buildVersion } : {}),
  };
}

export async function buildMobileDeviceAccessRegistrationInput(): Promise<{
  appVersion?: string;
  buildVersion?: string;
  deviceInstallationId: string;
  platform: MobileDeviceAccessPlatform;
  registrationSecret?: string;
} | null> {
  const platform = resolveNativeMobileDevicePlatform();

  if (!platform) {
    return null;
  }

  const registrationSecret = await getStoredMobileDeviceRegistrationSecret();

  return {
    deviceInstallationId: await getOrCreateDeviceInstallationId(),
    platform,
    ...readNativeBuildMetadata(),
    ...(registrationSecret ? { registrationSecret } : {}),
  };
}

export async function getStoredMobileDeviceRegistrationSecret(): Promise<string | null> {
  return readStoredString(DEVICE_STORAGE_KEYS.appInstallationRegistrationSecret);
}

export async function storeMobileDeviceRegistrationSecret(registrationSecret: string): Promise<void> {
  await writeStoredString(DEVICE_STORAGE_KEYS.appInstallationRegistrationSecret, registrationSecret);
}

export async function getMobileGraphqlHeaders(): Promise<Record<string, string>> {
  const platform = resolveNativeMobileDevicePlatform();

  if (!platform) {
    return {};
  }

  const { appVersion, buildVersion } = readNativeBuildMetadata();

  return {
    [GATHERLE_CLIENT_PLATFORM_HEADER]: GATHERLE_CLIENT_PLATFORM_MOBILE,
    [GATHERLE_DEVICE_INSTALLATION_ID_HEADER]: await getOrCreateDeviceInstallationId(),
    ...(appVersion ? { [GATHERLE_APP_VERSION_HEADER]: appVersion } : {}),
    ...(buildVersion ? { [GATHERLE_BUILD_VERSION_HEADER]: buildVersion } : {}),
  };
}
