import { Kind } from 'graphql';
import { createUserAppAccessPlugin } from '@/graphql/apollo/server';
import { GATHERLE_CLIENT_PLATFORM_MOBILE } from '@/constants';
import { MobileDeviceAccessStatus } from '@gatherle/commons/server/types';
import { emitMobileDeviceAccessMetrics } from '@/utils/mobileDeviceAccessMetrics';
import { MobileDeviceAccessDAO } from '@/mongodb/dao';

jest.mock('@/utils/mobileDeviceAccessMetrics', () => ({
  emitMobileDeviceAccessMetrics: jest.fn(),
}));

jest.mock('@/mongodb/dao', () => ({
  MobileDeviceAccessDAO: {
    recordAuthenticatedUse: jest.fn(),
  },
}));

describe('createUserAppAccessPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects blocked users before resolver execution and emits a blocked-user metric', async () => {
    const plugin = createUserAppAccessPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await expect(
      hooks?.didResolveOperation?.({
        contextValue: {
          loaders: {
            user: {
              load: jest.fn().mockResolvedValue({
                appAccessBlocked: true,
                userId: 'user-1',
              }),
            },
          },
          user: {
            userId: 'user-1',
          },
        },
        operation: {
          operation: 'query',
          selectionSet: {
            selections: [
              {
                kind: Kind.FIELD,
                name: { value: 'readUserById' },
              },
            ],
          },
        },
        operationName: 'ReadUserById',
        request: {
          operationName: 'ReadUserById',
          query: 'query ReadUserById { readUserById(userId: "user-1") { userId } }',
        },
      } as any),
    ).rejects.toMatchObject({
      extensions: {
        code: 'APP_ACCESS_BLOCKED',
        http: { status: 403 },
      },
      message: expect.stringContaining('blocked'),
    });

    expect(emitMobileDeviceAccessMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        clientPlatform: 'web',
        metrics: {
          BlockedUserRequest: 1,
        },
        operation: 'ReadUserById',
        status: 'BlockedUser',
        userId: 'user-1',
      }),
    );
    expect(MobileDeviceAccessDAO.recordAuthenticatedUse).not.toHaveBeenCalled();
  });

  it('records authenticated mobile usage for approved installations', async () => {
    const plugin = createUserAppAccessPlugin();
    const hooks = await plugin.requestDidStart?.({} as any);

    await expect(
      hooks?.didResolveOperation?.({
        contextValue: {
          loaders: {
            user: {
              load: jest.fn().mockResolvedValue({
                appAccessBlocked: false,
                userId: 'user-1',
              }),
            },
          },
          mobileDeviceAccess: {
            appVersion: '1.0.0',
            buildVersion: '100',
            clientPlatform: GATHERLE_CLIENT_PLATFORM_MOBILE,
            deviceInstallationId: 'installation-1',
            status: MobileDeviceAccessStatus.Approved,
          },
          user: {
            userId: 'user-1',
          },
        },
        operation: {
          operation: 'query',
          selectionSet: {
            selections: [
              {
                kind: Kind.FIELD,
                name: { value: 'readUserById' },
              },
            ],
          },
        },
        operationName: 'ReadUserById',
        request: {
          operationName: 'ReadUserById',
          query: 'query ReadUserById { readUserById(userId: "user-1") { userId } }',
        },
      } as any),
    ).resolves.toBeUndefined();

    expect(emitMobileDeviceAccessMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        appVersion: '1.0.0',
        buildVersion: '100',
        clientPlatform: GATHERLE_CLIENT_PLATFORM_MOBILE,
        deviceInstallationId: 'installation-1',
        metrics: {
          AuthenticatedInstallationRequest: 1,
        },
        operation: 'ReadUserById',
        status: MobileDeviceAccessStatus.Approved,
        userId: 'user-1',
      }),
    );
    expect(MobileDeviceAccessDAO.recordAuthenticatedUse).toHaveBeenCalledWith({
      appVersion: '1.0.0',
      buildVersion: '100',
      deviceInstallationId: 'installation-1',
      userId: 'user-1',
    });
  });
});
