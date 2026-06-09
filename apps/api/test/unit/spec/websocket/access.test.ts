import { MobileDeviceAccessStatus } from '@gatherle/commons/server/types';
import { MobileDeviceAccessDAO, UserDAO, WebSocketConnectionDAO } from '@/mongodb/dao';
import {
  assertWebSocketAccessAllowed,
  assertAuthorizedWebSocketConnectionRecord,
  readAuthorizedWebSocketConnection,
} from '@/websocket/access';

jest.mock('@/mongodb/dao', () => ({
  MobileDeviceAccessDAO: {
    readByDeviceInstallationId: jest.fn(),
  },
  UserDAO: {
    readUserById: jest.fn(),
  },
  WebSocketConnectionDAO: {
    readConnectionByConnectionId: jest.fn(),
    removeConnection: jest.fn(),
  },
}));

describe('websocket access helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (UserDAO.readUserById as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      appAccessBlocked: false,
    });
    (MobileDeviceAccessDAO.readByDeviceInstallationId as jest.Mock).mockResolvedValue({
      deviceInstallationId: 'device-1',
      status: MobileDeviceAccessStatus.Approved,
    });
    (WebSocketConnectionDAO.removeConnection as jest.Mock).mockResolvedValue(true);
  });

  it('authorizes active users on approved mobile installations', async () => {
    (WebSocketConnectionDAO.readConnectionByConnectionId as jest.Mock).mockResolvedValue({
      connectionId: 'conn-1',
      userId: 'user-1',
      deviceInstallationId: 'device-1',
      domainName: 'api.example.com',
      stage: 'beta',
    });

    await expect(readAuthorizedWebSocketConnection('conn-1')).resolves.toMatchObject({
      connectionId: 'conn-1',
      deviceInstallationId: 'device-1',
      userId: 'user-1',
    });
  });

  it('removes a stored connection and rejects when the user is blocked', async () => {
    (UserDAO.readUserById as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      appAccessBlocked: true,
    });

    await expect(
      assertAuthorizedWebSocketConnectionRecord({
        connectionId: 'conn-1',
        userId: 'user-1',
        domainName: 'api.example.com',
        stage: 'beta',
      } as any),
    ).rejects.toMatchObject({
      extensions: {
        code: 'APP_ACCESS_BLOCKED',
      },
    });

    expect(WebSocketConnectionDAO.removeConnection).toHaveBeenCalledWith('conn-1');
  });

  it('treats missing mobile device records as allowed and only blocks explicitly blocked installs', async () => {
    (MobileDeviceAccessDAO.readByDeviceInstallationId as jest.Mock).mockResolvedValue(null);

    await expect(
      assertWebSocketAccessAllowed({
        deviceInstallationId: 'device-1',
        userId: 'user-1',
      }),
    ).resolves.toBeUndefined();

    (MobileDeviceAccessDAO.readByDeviceInstallationId as jest.Mock).mockResolvedValue({
      deviceInstallationId: 'device-1',
      status: MobileDeviceAccessStatus.Blocked,
    });

    await expect(
      assertWebSocketAccessAllowed({
        deviceInstallationId: 'device-1',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      extensions: {
        code: 'DEVICE_ACCESS_DENIED',
        mobileDeviceAccessStatus: MobileDeviceAccessStatus.Blocked,
      },
    });
  });
});
