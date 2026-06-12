type DeviceInstallationModule = typeof import('@/lib/deviceInstallation');

function loadDeviceInstallationModule({
  applicationId = 'com.gatherle.mobile',
  brand = 'Apple',
  existingInstallationId = null,
  existingRegistrationSecret = null,
  interfaceIdiom = 'phone',
  model = 'iPhone',
  os = 'ios',
  osVersion = '18.5',
  readError,
  writeError,
}: {
  applicationId?: string;
  brand?: string;
  existingInstallationId?: string | null;
  existingRegistrationSecret?: string | null;
  interfaceIdiom?: string;
  model?: string;
  os?: 'android' | 'ios';
  osVersion?: number | string;
  readError?: Error;
  writeError?: Error;
} = {}) {
  const readStoredStringMock = readError
    ? jest
        .fn()
        .mockRejectedValueOnce(readError)
        .mockImplementation(async (key: string) =>
          key === 'gatherle.mobile.app-installation-registration-secret'
            ? existingRegistrationSecret
            : existingInstallationId,
        )
    : jest
        .fn()
        .mockImplementation(async (key: string) =>
          key === 'gatherle.mobile.app-installation-registration-secret'
            ? existingRegistrationSecret
            : existingInstallationId,
        );
  const writeStoredStringMock = writeError
    ? jest.fn().mockRejectedValue(writeError)
    : jest.fn().mockResolvedValue(undefined);
  const randomUUIDMock = jest.fn().mockReturnValue('generated-installation-id');

  jest.resetModules();
  jest.doMock('expo-application', () => ({
    applicationId,
    nativeApplicationVersion: '1.0.0',
    nativeBuildVersion: '100',
  }));
  jest.doMock('expo-crypto', () => ({
    randomUUID: randomUUIDMock,
  }));
  jest.doMock('react-native', () => ({
    Platform: {
      OS: os,
      Version: osVersion,
      constants:
        os === 'android'
          ? {
              Brand: brand,
              Model: model,
            }
          : {
              interfaceIdiom,
            },
    },
  }));
  jest.doMock('@/lib/deviceStorage', () => ({
    DEVICE_STORAGE_KEYS: {
      appInstallationId: 'gatherle.mobile.push-installation-id',
      appInstallationRegistrationSecret: 'gatherle.mobile.app-installation-registration-secret',
    },
    readStoredString: readStoredStringMock,
    writeStoredString: writeStoredStringMock,
  }));

  let deviceInstallationModule: DeviceInstallationModule;
  jest.isolateModules(() => {
    deviceInstallationModule = require('@/lib/deviceInstallation') as DeviceInstallationModule;
  });

  return {
    deviceInstallationModule: deviceInstallationModule!,
    randomUUIDMock,
    readStoredStringMock,
    writeStoredStringMock,
  };
}

describe('deviceInstallation', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('resets the memoized installation id promise after a storage read failure so a later retry can recover', async () => {
    const storageError = new Error('secure store temporarily unavailable');
    const { deviceInstallationModule, randomUUIDMock, readStoredStringMock, writeStoredStringMock } =
      loadDeviceInstallationModule({
        existingInstallationId: null,
        readError: storageError,
      });

    await expect(deviceInstallationModule.getOrCreateDeviceInstallationId()).rejects.toThrow(storageError);
    await expect(deviceInstallationModule.getOrCreateDeviceInstallationId()).resolves.toBe('generated-installation-id');

    expect(readStoredStringMock).toHaveBeenCalledTimes(2);
    expect(writeStoredStringMock).toHaveBeenCalledTimes(1);
    expect(writeStoredStringMock).toHaveBeenCalledWith(
      'gatherle.mobile.push-installation-id',
      'generated-installation-id',
    );
    expect(randomUUIDMock).toHaveBeenCalledTimes(1);
  });

  it('builds a mobile device access registration input with iOS metadata and registration secret', async () => {
    const { deviceInstallationModule } = loadDeviceInstallationModule({
      existingInstallationId: 'existing-installation-id',
      existingRegistrationSecret: 'existing-registration-secret',
    });

    const result = await deviceInstallationModule.buildMobileDeviceAccessRegistrationInput();

    expect(result).toEqual({
      appVersion: '1.0.0',
      applicationId: 'com.gatherle.mobile',
      buildVersion: '100',
      deviceBrand: 'Apple',
      deviceInstallationId: 'existing-installation-id',
      deviceModel: 'iPhone',
      osVersion: '18.5',
      platform: 'Ios',
      registrationSecret: 'existing-registration-secret',
    });
  });

  it('builds a mobile device access registration input with Android brand and model metadata', async () => {
    const { deviceInstallationModule } = loadDeviceInstallationModule({
      applicationId: 'com.gatherle.mobile.beta',
      brand: 'Samsung',
      existingInstallationId: 'android-installation-id',
      existingRegistrationSecret: 'android-registration-secret',
      model: 'SM-S928B',
      os: 'android',
      osVersion: 34,
    });

    const result = await deviceInstallationModule.buildMobileDeviceAccessRegistrationInput();

    expect(result).toEqual({
      appVersion: '1.0.0',
      applicationId: 'com.gatherle.mobile.beta',
      buildVersion: '100',
      deviceBrand: 'Samsung',
      deviceInstallationId: 'android-installation-id',
      deviceModel: 'SM-S928B',
      osVersion: '34',
      platform: 'Android',
      registrationSecret: 'android-registration-secret',
    });
  });
});
