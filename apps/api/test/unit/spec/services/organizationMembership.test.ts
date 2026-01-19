// Must mock before any imports that use these modules
jest.mock('@/constants', () => ({
    AWS_REGION: 'eu-west-1',
    STAGE: 'Dev',
    MONGO_DB_URL: 'mock-url',
    JWT_SECRET: 'test-secret',
    NTLANGO_SECRET_ARN: undefined,
    LOG_LEVEL: 1,
    GRAPHQL_API_PATH: '/v1/graphql',
    HttpStatusCode: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHENTICATED: 401,
        UNAUTHORIZED: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
    },
    REGEXT_MONGO_DB_ERROR: /\{ (.*?): (.*?) \}/,
    OPERATION_NAMES: {
        UPDATE_USER: 'updateUser',
        DELETE_USER_BY_ID: 'deleteUserById',
        DELETE_USER_BY_EMAIL: 'deleteUserByEmail',
        DELETE_USER_BY_USERNAME: 'deleteUserByUsername',
        UPDATE_EVENT: 'updateEvent',
        DELETE_EVENT: 'deleteEventById',
    },
}));

jest.mock('@/mongodb/dao', () => ({
    OrganizationMembershipDAO: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        readMembershipById: jest.fn(),
    },
    OrganizationDAO: {
        readOrganizationById: jest.fn(),
    },
}));

jest.mock('@/services/notification', () => ({
    notify: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import {OrganizationMembershipService} from '@/services';
import {OrganizationMembershipDAO, OrganizationDAO} from '@/mongodb/dao';
import NotificationService from '@/services/notification';
import type {OrganizationMembership, Organization} from '@ntlango/commons/types';
import {OrganizationRole, NotificationType, NotificationTargetType} from '@ntlango/commons/types';

describe('OrganizationMembershipService', () => {
    const mockMembership: OrganizationMembership = {
        membershipId: 'membership-1',
        orgId: 'org-1',
        userId: 'user-1',
        role: OrganizationRole.Member,
        joinedAt: new Date('2024-01-01T00:00:00Z'),
    };

    const mockOrganization: Partial<Organization> = {
        orgId: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
    };

    beforeEach(() => {
        // Mock OrganizationDAO for notification URL generation
        (OrganizationDAO.readOrganizationById as jest.Mock).mockResolvedValue(mockOrganization);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addMember', () => {
        it('creates membership and sends ORG_INVITE notification', async () => {
            (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);

            const result = await OrganizationMembershipService.addMember(
                {orgId: 'org-1', userId: 'user-1', role: OrganizationRole.Member},
                'admin-user',
            );

            expect(OrganizationMembershipDAO.create).toHaveBeenCalledWith({
                orgId: 'org-1',
                userId: 'user-1',
                role: OrganizationRole.Member,
            });
            expect(result).toEqual(mockMembership);

            // Wait for async notification
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(NotificationService.notify).toHaveBeenCalledWith({
                type: NotificationType.ORG_INVITE,
                recipientUserId: 'user-1',
                actorUserId: 'admin-user',
                targetType: NotificationTargetType.Organization,
                targetSlug: 'test-org',
            });
        });

        it('creates membership without actorUserId', async () => {
            (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);

            const result = await OrganizationMembershipService.addMember({
                orgId: 'org-1',
                userId: 'user-1',
                role: OrganizationRole.Member,
            });

            expect(result).toEqual(mockMembership);

            // Wait for async notification
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(NotificationService.notify).toHaveBeenCalledWith(
                expect.objectContaining({
                    actorUserId: undefined,
                }),
            );
        });

        it('succeeds even if notification fails', async () => {
            (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(mockMembership);
            (NotificationService.notify as jest.Mock).mockRejectedValue(new Error('Notification failed'));

            const result = await OrganizationMembershipService.addMember(
                {orgId: 'org-1', userId: 'user-1', role: OrganizationRole.Member},
                'admin-user',
            );

            expect(result).toEqual(mockMembership);

            // Wait for async notification to fail gracefully
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(NotificationService.notify).toHaveBeenCalled();
        });

        it('creates membership with Admin role', async () => {
            const adminMembership = {...mockMembership, role: OrganizationRole.Admin};
            (OrganizationMembershipDAO.create as jest.Mock).mockResolvedValue(adminMembership);

            const result = await OrganizationMembershipService.addMember({
                orgId: 'org-1',
                userId: 'user-1',
                role: OrganizationRole.Admin,
            });

            expect(result.role).toEqual(OrganizationRole.Admin);
        });
    });

    describe('updateMemberRole', () => {
        it('updates role and sends ORG_ROLE_CHANGED notification', async () => {
            const updatedMembership = {...mockMembership, role: OrganizationRole.Admin};
            (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
            (OrganizationMembershipDAO.update as jest.Mock).mockResolvedValue(updatedMembership);

            const result = await OrganizationMembershipService.updateMemberRole(
                {membershipId: 'membership-1', role: OrganizationRole.Admin},
                'admin-user',
            );

            expect(OrganizationMembershipDAO.readMembershipById).toHaveBeenCalledWith('membership-1');
            expect(OrganizationMembershipDAO.update).toHaveBeenCalledWith({
                membershipId: 'membership-1',
                role: OrganizationRole.Admin,
            });
            expect(result.role).toEqual(OrganizationRole.Admin);

            // Wait for async notification
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(NotificationService.notify).toHaveBeenCalledWith({
                type: NotificationType.ORG_ROLE_CHANGED,
                recipientUserId: 'user-1',
                actorUserId: 'admin-user',
                targetType: NotificationTargetType.Organization,
                targetSlug: 'test-org',
            });
        });

        it('does NOT send notification when user updates their own role', async () => {
            const updatedMembership = {...mockMembership, role: OrganizationRole.Admin};
            (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
            (OrganizationMembershipDAO.update as jest.Mock).mockResolvedValue(updatedMembership);

            await OrganizationMembershipService.updateMemberRole(
                {membershipId: 'membership-1', role: OrganizationRole.Admin},
                'user-1', // Same as membership userId
            );

            // Wait for potential async notification
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(NotificationService.notify).not.toHaveBeenCalled();
        });

        it('sends notification when updatedByUserId is undefined', async () => {
            const updatedMembership = {...mockMembership, role: OrganizationRole.Admin};
            (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
            (OrganizationMembershipDAO.update as jest.Mock).mockResolvedValue(updatedMembership);

            await OrganizationMembershipService.updateMemberRole({
                membershipId: 'membership-1',
                role: OrganizationRole.Admin,
            });

            // Wait for async notification
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(NotificationService.notify).toHaveBeenCalledWith(
                expect.objectContaining({
                    actorUserId: undefined,
                }),
            );
        });

        it('succeeds even if notification fails', async () => {
            const updatedMembership = {...mockMembership, role: OrganizationRole.Admin};
            (OrganizationMembershipDAO.readMembershipById as jest.Mock).mockResolvedValue(mockMembership);
            (OrganizationMembershipDAO.update as jest.Mock).mockResolvedValue(updatedMembership);
            (NotificationService.notify as jest.Mock).mockRejectedValue(new Error('Notification failed'));

            const result = await OrganizationMembershipService.updateMemberRole(
                {membershipId: 'membership-1', role: OrganizationRole.Admin},
                'admin-user',
            );

            expect(result.role).toEqual(OrganizationRole.Admin);

            // Wait for async notification to fail gracefully
            await new Promise((resolve) => setTimeout(resolve, 10));
        });
    });

    describe('removeMember', () => {
        it('removes membership without sending notification', async () => {
            (OrganizationMembershipDAO.delete as jest.Mock).mockResolvedValue(mockMembership);

            const result = await OrganizationMembershipService.removeMember('membership-1');

            expect(OrganizationMembershipDAO.delete).toHaveBeenCalledWith('membership-1');
            expect(result).toEqual(mockMembership);
            expect(NotificationService.notify).not.toHaveBeenCalled();
        });
    });
});
