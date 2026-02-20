import request from 'supertest';
import { Types } from 'mongoose';
import type { E2EServer } from '@/test/e2e/utils/server';
import { startE2EServer, stopE2EServer } from '@/test/e2e/utils/server';
import type { UserWithToken } from '@gatherle/commons/types';
import { OrganizationRole } from '@gatherle/commons/types';
import {
  getCreateOrganizationMembershipMutation,
  getDeleteOrganizationMembershipMutation,
  getReadOrganizationMembershipByIdQuery,
  getReadOrganizationMembershipsByOrgIdQuery,
  getDeleteOrganizationByIdMutation,
  getUpdateOrganizationMembershipMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser } from '@/test/e2e/utils/helpers';
import { createMembershipOnServer, createOrganizationOnServer } from '@/test/e2e/utils/eventResolverHelpers';

describe('OrganizationMembership Resolver', () => {
  let server: E2EServer;
  let url = '';
  const TEST_PORT = 5005;
  let adminUser: UserWithToken;
  let testUser2: UserWithToken;
  const createdMembershipIds: string[] = [];
  const createdOrgIds: string[] = [];

  const createOrganization = (name: string) =>
    createOrganizationOnServer(url, adminUser.token, adminUser.userId, name, createdOrgIds);

  const createMembership = (orgId: string, userId: string) =>
    createMembershipOnServer(url, adminUser.token, orgId, userId, OrganizationRole.Member, createdMembershipIds);

  beforeAll(async () => {
    server = await startE2EServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
    testUser2 = await loginSeededUser(url, seededUsers.user2.email, seededUsers.user2.password);
  });

  afterAll(async () => {
    if (server) {
      await stopE2EServer(server);
    }
  });

  afterEach(async () => {
    await Promise.all(
      createdMembershipIds.map((membershipId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getDeleteOrganizationMembershipMutation({ membershipId }))
          .catch(() => {}),
      ),
    );

    await Promise.all(
      createdOrgIds.map((orgId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getDeleteOrganizationByIdMutation(orgId))
          .catch(() => {}),
      ),
    );

    createdMembershipIds.length = 0;
    createdOrgIds.length = 0;
  });

  describe('Positive', () => {
    it('creates a membership successfully', async () => {
      const organization = await createOrganization('Membership Org');
      const membership = await createMembership(organization.orgId, testUser2.userId);

      expect(membership).toHaveProperty('membershipId');
      expect(membership.orgId).toBe(organization.orgId);
    });

    it('updates a membership role', async () => {
      const organization = await createOrganization('Membership Update Org');
      const membership = await createMembership(organization.orgId, testUser2.userId);

      const updateResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateOrganizationMembershipMutation({
            membershipId: membership.membershipId,
            role: OrganizationRole.Host,
          }),
        );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.updateOrganizationMembership.role).toBe(OrganizationRole.Host);
    });

    it('reads membership by id and org id', async () => {
      const organization = await createOrganization('Membership Read Org');
      const membership = await createMembership(organization.orgId, testUser2.userId);

      const byIdResponse = await request(url)
        .post('')
        .send(getReadOrganizationMembershipByIdQuery(membership.membershipId));
      expect(byIdResponse.status).toBe(200);
      expect(byIdResponse.body.data.readOrganizationMembershipById.membershipId).toBe(membership.membershipId);

      const byOrgResponse = await request(url)
        .post('')
        .send(getReadOrganizationMembershipsByOrgIdQuery(organization.orgId));
      expect(byOrgResponse.status).toBe(200);
      expect(byOrgResponse.body.data.readOrganizationMembershipsByOrgId).toEqual(
        expect.arrayContaining(
          [{ membershipId: membership.membershipId }].map((item) => expect.objectContaining(item)),
        ),
      );
    });

    it('deletes membership via mutation', async () => {
      const organization = await createOrganization('Membership Delete Org');
      const membership = await createMembership(organization.orgId, testUser2.userId);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getDeleteOrganizationMembershipMutation({ membershipId: membership.membershipId }));

      expect(response.status).toBe(200);
      expect(response.body.data.deleteOrganizationMembership.membershipId).toBe(membership.membershipId);
      createdMembershipIds.splice(createdMembershipIds.indexOf(membership.membershipId), 1);
    });
  });

  describe('Negative', () => {
    it('requires admin token to create membership', async () => {
      const organization = await createOrganization('Membership Unauthorized Org');

      const response = await request(url)
        .post('')
        .send(
          getCreateOrganizationMembershipMutation({
            orgId: organization.orgId,
            userId: testUser2.userId,
            role: OrganizationRole.Member,
          }),
        );

      expect(response.status).toBe(401);
    });

    it('returns 404 when membership id does not exist', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateOrganizationMembershipMutation({
            membershipId: new Types.ObjectId().toString(),
            role: OrganizationRole.Host,
          }),
        );

      expect(response.status).toBe(404);
    });
  });
});
