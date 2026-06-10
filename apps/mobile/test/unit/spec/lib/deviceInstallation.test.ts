type DeviceInstallationModule = typeof import('@/lib/deviceInstallation');

function loadDeviceInstallationModule({
  existingInstallationId = null,
  readError,
  writeError,
}: {
  existingInstallationId?: string | null;
  readError?: Error;
  writeError?: Error;
} = {}) {
  const readStoredStringMock = readError
    ? jest.fn().mockRejectedValueOnce(readError).mockResolvedValue(existingInstallationId)
    : jest.fn().mockResolvedValue(existingInstallationId);
  const writeStoredStringMock = writeError
    ? jest.fn().mockRejectedValue(writeError)
    : jest.fn().mockResolvedValue(undefined);
  const randomUUIDMock = jest.fn().mockReturnValue('generated-installation-id');

  jest.resetModules();
  jest.doMock('expo-application', () => ({
    nativeApplicationVersion: '1.0.0',
    nativeBuildVersion: '100',
  }));
  jest.doMock('expo-crypto', () => ({
    randomUUID: randomUUIDMock,
  }));
  jest.doMock('react-native', () => ({
    Platform: {
      OS: 'ios',
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
});
