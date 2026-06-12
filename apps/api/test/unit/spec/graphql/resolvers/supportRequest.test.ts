import 'reflect-metadata';

jest.mock('@/mongodb/dao', () => ({
  SupportRequestDAO: {
    create: jest.fn(),
    readMany: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('@/clients/AWS/s3Client', () => ({
  getKeyFromPublicUrl: jest.fn(),
  getS3ObjectSize: jest.fn(),
}));

jest.mock('@/utils', () => ({
  CustomError: (message: string) => new Error(message),
  ErrorTypes: {
    BAD_USER_INPUT: 'BAD_USER_INPUT',
  },
  getAuthenticatedUser: jest.fn(),
}));

import { SupportRequestResolver } from '@/graphql/resolvers/supportRequest';
import { SUPPORT_REQUEST_LIMITS } from '@gatherle/commons/server/constants';
import { SupportRequestKind, SupportRequestStatus } from '@gatherle/commons/server/types';
import * as s3Client from '@/clients/AWS/s3Client';
import * as authUtils from '@/utils';
import * as DaoModule from '@/mongodb/dao';

const mockRequester = {
  email: 'member@example.com',
  userId: 'user-123',
};

describe('SupportRequestResolver', () => {
  let resolver: SupportRequestResolver;

  beforeEach(() => {
    resolver = new SupportRequestResolver();
    jest.clearAllMocks();
    (authUtils.getAuthenticatedUser as jest.Mock).mockReturnValue(mockRequester);
    (DaoModule.SupportRequestDAO.create as jest.Mock).mockResolvedValue({
      supportRequestId: 'support-1',
      requesterUserId: mockRequester.userId,
      requesterEmail: mockRequester.email,
      kind: SupportRequestKind.Help,
      status: SupportRequestStatus.Open,
      subject: 'Need help with alerts',
      message: 'Alerts are enabled, but I am not receiving them.',
      platform: 'web',
      createdAt: new Date(),
    });
    (DaoModule.SupportRequestDAO.readMany as jest.Mock).mockResolvedValue([]);
    (DaoModule.SupportRequestDAO.updateStatus as jest.Mock).mockResolvedValue({
      supportRequestId: 'support-1',
      requesterUserId: mockRequester.userId,
      requesterEmail: mockRequester.email,
      kind: SupportRequestKind.Help,
      status: SupportRequestStatus.Resolved,
      subject: 'Need help with alerts',
      message: 'Alerts are enabled, but I am not receiving them.',
      createdAt: new Date(),
    });
    (s3Client.getKeyFromPublicUrl as jest.Mock).mockReturnValue('beta/support-requests/support-1/attachment.png');
    (s3Client.getS3ObjectSize as jest.Mock).mockResolvedValue(SUPPORT_REQUEST_LIMITS.screenshotMaxBytes);
  });

  it('delegates admin support request reads to the DAO', async () => {
    await resolver.readSupportRequests({
      limit: 25,
      search: 'alerts',
      status: SupportRequestStatus.Open,
    });

    expect(DaoModule.SupportRequestDAO.readMany).toHaveBeenCalledWith({
      limit: 25,
      search: 'alerts',
      status: SupportRequestStatus.Open,
    });
  });

  it('delegates to SupportRequestDAO with a web context by default', async () => {
    await resolver.createSupportRequest(
      {
        kind: SupportRequestKind.Help,
        message: 'Alerts are enabled, but I am not receiving them.',
        pagePath: '/account/support',
        subject: 'Need help with alerts',
      },
      {
        loaders: {} as any,
        req: {
          headers: {
            'user-agent': 'Mozilla/5.0',
          },
        } as any,
      } as any,
    );

    expect(DaoModule.SupportRequestDAO.create).toHaveBeenCalledWith({
      appVersion: undefined,
      buildVersion: undefined,
      input: {
        kind: SupportRequestKind.Help,
        message: 'Alerts are enabled, but I am not receiving them.',
        pagePath: '/account/support',
        subject: 'Need help with alerts',
      },
      platform: 'web',
      requesterEmail: mockRequester.email,
      requesterUserId: mockRequester.userId,
      userAgent: 'Mozilla/5.0',
    });
  });

  it('passes mobile app metadata through when present on the request context', async () => {
    await resolver.createSupportRequest(
      {
        kind: SupportRequestKind.Bug,
        message: 'The app hangs after I try to save my profile.',
        subject: 'Profile save freeze',
      },
      {
        loaders: {} as any,
        mobileDeviceAccess: {
          appVersion: '1.2.3',
          buildVersion: '100',
          clientPlatform: 'mobile',
        },
        req: {
          headers: {
            'user-agent': 'Expo/54',
          },
        } as any,
      } as any,
    );

    expect(DaoModule.SupportRequestDAO.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appVersion: '1.2.3',
        buildVersion: '100',
        platform: 'mobile',
        userAgent: 'Expo/54',
      }),
    );
  });

  it('verifies uploaded screenshots before creating the support request', async () => {
    await resolver.createSupportRequest(
      {
        kind: SupportRequestKind.Bug,
        message: 'The form fails after I attach a screenshot and submit it.',
        screenshotUrl: 'https://cdn.example.com/beta/support-requests/support-1/attachment.png',
        subject: 'Screenshot upload issue',
      },
      {
        loaders: {} as any,
        req: {
          headers: {
            'user-agent': 'Mozilla/5.0',
          },
        } as any,
      } as any,
    );

    expect(s3Client.getKeyFromPublicUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/beta/support-requests/support-1/attachment.png',
    );
    expect(s3Client.getS3ObjectSize).toHaveBeenCalledWith('beta/support-requests/support-1/attachment.png');
    expect(DaoModule.SupportRequestDAO.create).toHaveBeenCalled();
  });

  it('rejects screenshots that exceed the upload size limit', async () => {
    (s3Client.getS3ObjectSize as jest.Mock).mockResolvedValue(SUPPORT_REQUEST_LIMITS.screenshotMaxBytes + 1);

    await expect(
      resolver.createSupportRequest(
        {
          kind: SupportRequestKind.Bug,
          message: 'The form fails after I attach a screenshot and submit it.',
          screenshotUrl: 'https://cdn.example.com/beta/support-requests/support-1/attachment.png',
          subject: 'Screenshot upload issue',
        },
        {
          loaders: {} as any,
          req: {
            headers: {
              'user-agent': 'Mozilla/5.0',
            },
          } as any,
        } as any,
      ),
    ).rejects.toThrow('Screenshot must be 15 MB or smaller.');

    expect(DaoModule.SupportRequestDAO.create).not.toHaveBeenCalled();
  });

  it('delegates support request status updates to the DAO', async () => {
    await resolver.updateSupportRequestStatus({
      supportRequestId: '6853a2332b4de53c70313f7a',
      status: SupportRequestStatus.Resolved,
    });

    expect(DaoModule.SupportRequestDAO.updateStatus).toHaveBeenCalledWith({
      supportRequestId: '6853a2332b4de53c70313f7a',
      status: SupportRequestStatus.Resolved,
    });
  });
});
