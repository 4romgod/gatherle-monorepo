import request from 'supertest';
import {Types} from 'mongoose';
import type {IntegrationServer} from '@/test/integration/utils/server';
import {startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {generateToken} from '@/utils/auth';
import {usersMockData} from '@/mongodb/mockData';
import type {User, UserWithToken} from '@ntlango/commons/types';
import {OrganizationDAO} from '@/mongodb/dao';
import {UserRole, OrganizationRole, OrganizationTicketAccess} from '@ntlango/commons/types';
import {
  getCreateOrganizationMembershipMutation,
  getDeleteOrganizationMembershipMutation,
  getReadOrganizationMembershipByIdQuery,
  getReadOrganizationMembershipsByOrgIdQuery,
  getCreateOrganizationMutation,
  getUpdateOrganizationMembershipMutation,
} from '@/test/utils';

describe('OrganizationMembership Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5005;
  let adminUser: UserWithToken;
  const createdMembershipIds: string[] = [];
  const createdOrgIds: string[] = [];

  const createOrganization = async (name: string) => {
    const response = await request(url)
      .post('')
      .set('token', adminUser.token)
      .send(
        getCreateOrganizationMutation({
          name,
          ownerId: adminUser.userId,
          allowedTicketAccess: OrganizationTicketAccess.Public,
        }),
      );

    const organization = response.body.data.createOrganization;
    createdOrgIds.push(organization.orgId);
    return organization;
  };

  const createMembership = async (orgId: string, userId: string) => {
    const response = await request(url)
      .post('')
      .set('token', adminUser.token)
      .send(
        getCreateOrganizationMembershipMutation({
          orgId,
          userId,
          role: OrganizationRole.Member,
        }),
      );

    const membership = response.body.data.createOrganizationMembership;
    createdMembershipIds.push(membership.membershipId);
    return membership;
  };

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
    url = server.url;
    const user: User = {
      ...usersMockData[0],
      userId: new Types.ObjectId().toString(),
      username: 'membershipAdmin',
      email: 'membership-admin@example.com',
      userRole: UserRole.Admin,
      interests: undefined,
    } as User;
    const token = await generateToken(user);
    adminUser = {...user, token};
  });

  afterAll(async () => {
    await stopIntegrationServer(server);
  });

  afterEach(async () => {
    await Promise.all(
      createdMembershipIds.map((membershipId) =>
        request(url)
          .post('')
          .set('token', adminUser.token)
          .send(getDeleteOrganizationMembershipMutation({membershipId}))
          .catch(() => {}),
      ),
    );
    await Promise.all(
      createdOrgIds.map((orgId) => OrganizationDAO.deleteOrganizationById(orgId).catch(() => {})),
    );
    createdMembershipIds.length = 0;
    createdOrgIds.length = 0;
  });

  describe('Positive', () => {
    it('creates a membership successfully', async () => {
      const organization = await createOrganization('Membership Org');
      const membership = await createMembership(organization.orgId, new Types.ObjectId().toString());

      expect(membership).toHaveProperty('membershipId');
      expect(membership.orgId).toBe(organization.orgId);
    });

    it('updates a membership role', async () => {
      const organization = await createOrganization('Membership Update Org');
      const membership = await createMembership(organization.orgId, new Types.ObjectId().toString());

      const response = await request(url)
        .post('')
        .set('token', adminUser.token)
        .send(
          getUpdateOrganizationMembershipMutation({
            membershipId: membership.membershipId,
            role: OrganizationRole.Host,
          }),
        );

      expect(response.status).toBe(200);
      expect(response.body.data.updateOrganizationMembership.role).toBe(OrganizationRole.Host);
    });

    it('reads membership by id and org id', async () => {
      const organization = await createOrganization('Membership Read Org');
      const membership = await createMembership(organization.orgId, new Types.ObjectId().toString());

      const byIdResponse = await request(url)
        .post('')
        .send(getReadOrganizationMembershipByIdQuery(membership.membershipId));
      expect(byIdResponse.status).toBe(200);
      expect(byIdResponse.body.data.readOrganizationMembershipById.membershipId).toBe(
        membership.membershipId,
      );

      const byOrgResponse = await request(url)
        .post('')
        .send(getReadOrganizationMembershipsByOrgIdQuery(organization.orgId));
      expect(byOrgResponse.status).toBe(200);
      expect(byOrgResponse.body.data.readOrganizationMembershipsByOrgId).toEqual(
        expect.arrayContaining([{membershipId: membership.membershipId}].map((item) => expect.objectContaining(item))),
      );
    });

    it('deletes membership via mutation', async () => {
      const organization = await createOrganization('Membership Delete Org');
      const membership = await createMembership(organization.orgId, new Types.ObjectId().toString());

      const response = await request(url)
        .post('')
        .set('token', adminUser.token)
        .send(getDeleteOrganizationMembershipMutation({membershipId: membership.membershipId}));

      expect(response.status).toBe(200);
      expect(response.body.data.deleteOrganizationMembership.membershipId).toBe(
        membership.membershipId,
      );
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
            userId: new Types.ObjectId().toString(),
            role: OrganizationRole.Member,
          }),
        );

      expect(response.status).toBe(401);
    });

    it('returns 404 when membership id does not exist', async () => {
      const response = await request(url)
        .post('')
        .set('token', adminUser.token)
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
