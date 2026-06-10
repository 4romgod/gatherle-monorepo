import { Kind } from 'graphql';
import { createMobileDeviceAccessPlugin } from '@/graphql/apollo/server';
import { MobileDeviceAccessStatus, UserRole } from '@gatherle/commons/server/types';
import { GATHERLE_CLIENT_PLATFORM_MOBILE } from '@/constants';
import { emitMobileDeviceAccessMetrics } from '@/utils/mobileDeviceAccessMetrics';

jest.mock('@/utils/mobileDeviceAccessMetrics', () => ({
  emitMobileDeviceAccessMetrics: jest.fn(),
}));

describe('createMobileDeviceAccessPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the registration mutation to pass through before device state is known', async () => {
    const plugin = createMobileDeviceAccessPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await expect(
      hooks?.didResolveOperation?.({
        contextValue: {
          mobileDeviceAccess: {
            clientPlatform: GATHERLE_CLIENT_PLATFORM_MOBILE,
            deviceInstallationId: 'installation-1',
            status: MobileDeviceAccessStatus.Pending,
          },
        },
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: Kind.FIELD,
                name: { value: 'registerMobileDeviceAccess' },
              },
            ],
          },
        },
        request: {
          operationName: 'RegisterMobileDeviceAccess',
          query: 'mutation RegisterMobileDeviceAccess { registerMobileDeviceAccess(input: $input) { status } }',
        },
      } as any),
    ).resolves.toBeUndefined();
  });

  it('allows non-blocked mobile installations to access non-exempt operations', async () => {
    const plugin = createMobileDeviceAccessPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await expect(
      hooks?.didResolveOperation?.({
        contextValue: {
          mobileDeviceAccess: {
            appVersion: '1.0.0',
            buildVersion: '100',
            clientPlatform: GATHERLE_CLIENT_PLATFORM_MOBILE,
            deviceInstallationId: 'installation-1',
            status: MobileDeviceAccessStatus.Pending,
          },
        },
        operation: {
          operation: 'query',
          selectionSet: {
            selections: [
              {
                kind: Kind.FIELD,
                name: { value: 'readEventOccurrences' },
              },
            ],
          },
        },
        operationName: 'ReadEventOccurrences',
        request: {
          operationName: 'ReadEventOccurrences',
          query: 'query ReadEventOccurrences { readEventOccurrences { eventOccurrenceId } }',
        },
      } as any),
    ).resolves.toBeUndefined();

    expect(emitMobileDeviceAccessMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceInstallationId: 'installation-1',
        metrics: {
          ApprovedInstallationRequest: 1,
        },
        operation: 'ReadEventOccurrences',
        status: MobileDeviceAccessStatus.Approved,
      }),
    );
  });

  it('allows admin-only mobile access management operations from blocked admin installations', async () => {
    const plugin = createMobileDeviceAccessPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await expect(
      hooks?.didResolveOperation?.({
        contextValue: {
          mobileDeviceAccess: {
            appVersion: '1.0.0',
            buildVersion: '100',
            clientPlatform: GATHERLE_CLIENT_PLATFORM_MOBILE,
            deviceInstallationId: 'installation-1',
            status: MobileDeviceAccessStatus.Blocked,
          },
          user: {
            userId: 'admin-user-1',
            userRole: UserRole.Admin,
          },
        },
        operation: {
          operation: 'mutation',
          selectionSet: {
            selections: [
              {
                kind: Kind.FIELD,
                name: { value: 'updateMobileDeviceAccessStatus' },
              },
            ],
          },
        },
        operationName: 'UpdateMobileDeviceAccessStatus',
        request: {
          operationName: 'UpdateMobileDeviceAccessStatus',
          query:
            'mutation UpdateMobileDeviceAccessStatus { updateMobileDeviceAccessStatus(input: $input) { deviceInstallationId status } }',
        },
      } as any),
    ).resolves.toBeUndefined();

    expect(emitMobileDeviceAccessMetrics).not.toHaveBeenCalled();
  });

  it('still rejects admin-only mobile access management operations for non-admin users on blocked installations', async () => {
    const plugin = createMobileDeviceAccessPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await expect(
      hooks?.didResolveOperation?.({
        contextValue: {
          mobileDeviceAccess: {
            appVersion: '1.0.0',
            buildVersion: '100',
            clientPlatform: GATHERLE_CLIENT_PLATFORM_MOBILE,
            deviceInstallationId: 'installation-1',
            status: MobileDeviceAccessStatus.Blocked,
          },
          user: {
            userId: 'user-1',
            userRole: UserRole.User,
          },
        },
        operation: {
          operation: 'query',
          selectionSet: {
            selections: [
              {
                kind: Kind.FIELD,
                name: { value: 'readMobileDeviceAccesses' },
              },
            ],
          },
        },
        operationName: 'ReadMobileDeviceAccesses',
        request: {
          operationName: 'ReadMobileDeviceAccesses',
          query: 'query ReadMobileDeviceAccesses { readMobileDeviceAccesses { deviceInstallationId status } }',
        },
      } as any),
    ).rejects.toMatchObject({
      extensions: {
        code: 'DEVICE_ACCESS_DENIED',
        http: { status: 403 },
        mobileDeviceAccessStatus: MobileDeviceAccessStatus.Blocked,
      },
      message: expect.stringContaining('blocked'),
    });

    expect(emitMobileDeviceAccessMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceInstallationId: 'installation-1',
        metrics: {
          BlockedInstallationRequest: 1,
        },
        operation: 'ReadMobileDeviceAccesses',
        status: MobileDeviceAccessStatus.Blocked,
      }),
    );
  });
});
