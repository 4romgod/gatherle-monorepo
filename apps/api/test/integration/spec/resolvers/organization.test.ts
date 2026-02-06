import request from 'supertest';
import { Types } from 'mongoose';
import type { IntegrationServer } from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer } from '@/test/integration/utils/server';
import { OrganizationDAO, OrganizationMembershipDAO } from '@/mongodb/dao';
import { usersMockData } from '@/mongodb/mockData';
import { generateToken } from '@/utils/auth';
import type { User, UserWithToken } from '@ntlango/commons/types';
import { UserRole, OrganizationRole } from '@ntlango/commons/types';
import {
  getCreateOrganizationMutation,
  getReadMyOrganizationsQuery,
  getReadOrganizationByIdQuery,
  getReadOrganizationBySlugQuery,
  getReadOrganizationsQuery,
  getReadOrganizationsWithOptionsQuery,
  getUpdateOrganizationMutation,
} from '@/test/utils';

describe('Organization Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5003;
  let adminUser: UserWithToken;
  const createdOrgIds: string[] = [];
  const createdMembershipIds: string[] = [];
  const randomId = () => Math.random().toString(36).slice(2, 8);

  const buildOrganizationInput = (name: string) => ({
    name,
    ownerId: adminUser.userId,
  });

  const createOrganizationOnServer = async () => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + adminUser.token)
      .send(getCreateOrganizationMutation(buildOrganizationInput('integration-org')));

    const createdOrganization = response.body.data.createOrganization;
    createdOrgIds.push(createdOrganization.orgId);
    return createdOrganization;
  };

  beforeAll(async () => {
    server = await startIntegrationServer({ port: TEST_PORT });
    url = server.url;
    const user: User = {
      ...usersMockData[0],
      userId: new Types.ObjectId().toString(),
      username: 'organizationAdmin',
      email: 'organization-admin@example.com',
      userRole: UserRole.Admin,
      interests: undefined,
    } as User;
    const token = await generateToken(user);
    adminUser = {
      ...user,
      token,
    };
  });

  afterAll(async () => {
    await stopIntegrationServer(server);
  });

  afterEach(async () => {
    await Promise.all(
      createdMembershipIds.map((membershipId) => OrganizationMembershipDAO.delete(membershipId).catch(() => {})),
    );
    createdMembershipIds.length = 0;
    await Promise.all(createdOrgIds.map((orgId) => OrganizationDAO.deleteOrganizationById(orgId).catch(() => {})));
    createdOrgIds.length = 0;
  });

  describe('Positive', () => {
    it('creates a new organization with valid input', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput('create-org')));

      expect(response.status).toBe(200);
      expect(response.body.data.createOrganization).toHaveProperty('orgId');
      createdOrgIds.push(response.body.data.createOrganization.orgId);
    });

    it('reads organization by id and slug after creation', async () => {
      const createdOrganization = await createOrganizationOnServer();

      const byIdResponse = await request(url).post('').send(getReadOrganizationByIdQuery(createdOrganization.orgId));

      expect(byIdResponse.status).toBe(200);
      expect(byIdResponse.body.data.readOrganizationById.orgId).toBe(createdOrganization.orgId);

      const bySlugResponse = await request(url).post('').send(getReadOrganizationBySlugQuery(createdOrganization.slug));

      expect(bySlugResponse.status).toBe(200);
      expect(bySlugResponse.body.data.readOrganizationBySlug.slug).toBe(createdOrganization.slug);
    });

    it('updates an organization with valid input', async () => {
      const createdOrganization = await createOrganizationOnServer();

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateOrganizationMutation({
            orgId: createdOrganization.orgId,
            description: 'Updated description',
          }),
        );

      expect(response.status).toBe(200);
      expect(response.body.data.updateOrganization.description).toBe('Updated description');
    });

    it('reads organizations list with and without options', async () => {
      const createdOrganization = await createOrganizationOnServer();

      const allResponse = await request(url).post('').send(getReadOrganizationsQuery());
      expect(allResponse.status).toBe(200);
      expect(allResponse.body.data.readOrganizations).toEqual(
        expect.arrayContaining([{ orgId: createdOrganization.orgId }].map((org) => expect.objectContaining(org))),
      );

      const options = { filters: [{ field: 'name', value: createdOrganization.name }] };
      const filteredResponse = await request(url).post('').send(getReadOrganizationsWithOptionsQuery(options));

      expect(filteredResponse.status).toBe(200);
      const filteredList = filteredResponse.body.data.readOrganizations;
      expect(filteredList).toEqual(
        expect.arrayContaining([{ orgId: createdOrganization.orgId }].map((org) => expect.objectContaining(org))),
      );
    });

    it('reads organizations with pagination options', async () => {
      await createOrganizationOnServer();
      const response2 = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput('org-two')));
      const org2 = response2.body.data.createOrganization;
      createdOrgIds.push(org2.orgId);

      const paginatedResponse = await request(url)
        .post('')
        .send(
          getReadOrganizationsWithOptionsQuery({
            pagination: {
              skip: 0,
              limit: 1,
            },
          }),
        );

      expect(paginatedResponse.status).toBe(200);
      expect(paginatedResponse.body.data.readOrganizations.length).toBeLessThanOrEqual(1);
    });

    it('reads organizations with sort options', async () => {
      await createOrganizationOnServer();

      const sortedResponse = await request(url)
        .post('')
        .send(
          getReadOrganizationsWithOptionsQuery({
            sort: [{ field: 'name', order: 'asc' }],
          }),
        );

      expect(sortedResponse.status).toBe(200);
      const orgs = sortedResponse.body.data.readOrganizations;
      if (orgs.length > 1) {
        const names = orgs.map((o: any) => o.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      }
    });

    it('validates organization name is returned correctly', async () => {
      const testName = 'Test Organization Name';
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput(testName)));

      expect(response.status).toBe(200);
      expect(response.body.data.createOrganization.name).toBe(testName);
      createdOrgIds.push(response.body.data.createOrganization.orgId);
    });

    it('returns the user’s organizations with associated roles', async () => {
      const org1 = await OrganizationDAO.create({
        name: `read-my-org-1-${randomId()}`,
        ownerId: adminUser.userId,
      });
      createdOrgIds.push(org1.orgId);

      const membership1 = await OrganizationMembershipDAO.create({
        orgId: org1.orgId,
        userId: adminUser.userId,
        role: OrganizationRole.Admin,
      });
      createdMembershipIds.push(membership1.membershipId);

      const org2 = await OrganizationDAO.create({
        name: `read-my-org-2-${randomId()}`,
        ownerId: adminUser.userId,
      });
      createdOrgIds.push(org2.orgId);

      const membership2 = await OrganizationMembershipDAO.create({
        orgId: org2.orgId,
        userId: adminUser.userId,
        role: OrganizationRole.Member,
      });
      createdMembershipIds.push(membership2.membershipId);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getReadMyOrganizationsQuery());

      expect(response.status).toBe(200);
      const myOrgs = response.body.data.readMyOrganizations;
      expect(myOrgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: OrganizationRole.Admin,
            organization: expect.objectContaining({ orgId: org1.orgId }),
          }),
          expect.objectContaining({
            role: OrganizationRole.Member,
            organization: expect.objectContaining({ orgId: org2.orgId }),
          }),
        ]),
      );
    });
  });

  describe('Negative', () => {
    it('requires admin token to create organization', async () => {
      const response = await request(url)
        .post('')
        .send(getCreateOrganizationMutation(buildOrganizationInput('unauthorized-org')));

      expect(response.status).toBe(401);
    });

    it('returns validation error for missing organization name', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getCreateOrganizationMutation({
            name: '',
            ownerId: adminUser.userId,
          }),
        );

      expect(response.status).toBe(400);
    });

    it('overrides provided ownerId with the authenticated user', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getCreateOrganizationMutation({
            name: 'Invalid Owner Override',
            ownerId: 'invalid-id',
          }),
        );

      expect(response.status).toBe(200);
      const organization = response.body.data.createOrganization;
      expect(organization.ownerId).toBe(adminUser.userId);
      createdOrgIds.push(organization.orgId);
    });

    it('returns conflict when duplicate organization name is used', async () => {
      const orgName = 'Duplicate Org';
      const createdOrganization = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput(orgName)));
      createdOrgIds.push(createdOrganization.body.data.createOrganization.orgId);

      const duplicateResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput(orgName)));

      expect(duplicateResponse.status).toBe(409);
    });

    it('returns 404 when updating non-existent organization', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateOrganizationMutation({
            orgId: new Types.ObjectId().toString(),
            description: 'ghost',
          }),
        );

      expect(response.status).toBe(404);
    });

    it('returns 404 when reading a missing slug', async () => {
      const response = await request(url).post('').send(getReadOrganizationBySlugQuery('missing-slug'));

      expect(response.status).toBe(404);
    });

    it('returns 404 when reading non-existent organization by id', async () => {
      const response = await request(url).post('').send(getReadOrganizationByIdQuery(new Types.ObjectId().toString()));

      expect(response.status).toBe(404);
    });

    it('requires authentication for updating organization', async () => {
      const createdOrganization = await createOrganizationOnServer();

      const response = await request(url)
        .post('')
        .send(
          getUpdateOrganizationMutation({
            orgId: createdOrganization.orgId,
            description: 'No auth',
          }),
        );

      expect(response.status).toBe(401);
    });
  });
});
