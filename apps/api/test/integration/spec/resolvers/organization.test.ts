import request from 'supertest';
import {Types} from 'mongoose';
import type {IntegrationServer} from '@/test/integration/utils/server';
import {startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {OrganizationDAO} from '@/mongodb/dao';
import {usersMockData} from '@/mongodb/mockData';
import {generateToken} from '@/utils/auth';
import type {User, UserWithToken} from '@ntlango/commons/types';
import {UserRole} from '@ntlango/commons/types';
import {OrganizationTicketAccess} from '@ntlango/commons/types';
import {
  getCreateOrganizationMutation,
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

  const buildOrganizationInput = (name: string) => ({
    name,
    ownerId: adminUser.userId,
    allowedTicketAccess: OrganizationTicketAccess.Public,
  });

  const createOrganizationOnServer = async () => {
    const response = await request(url)
      .post('')
      .set('token', adminUser.token)
      .send(getCreateOrganizationMutation(buildOrganizationInput('integration-org')));

    const createdOrganization = response.body.data.createOrganization;
    createdOrgIds.push(createdOrganization.orgId);
    return createdOrganization;
  };

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
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
      createdOrgIds.map((orgId) => OrganizationDAO.deleteOrganizationById(orgId).catch(() => {})),
    );
    createdOrgIds.length = 0;
  });

  describe('Positive', () => {
    it('creates a new organization with valid input', async () => {
      const response = await request(url)
        .post('')
        .set('token', adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput('create-org')));

      expect(response.status).toBe(200);
      expect(response.body.data.createOrganization).toHaveProperty('orgId');
      createdOrgIds.push(response.body.data.createOrganization.orgId);
    });

    it('reads organization by id and slug after creation', async () => {
      const createdOrganization = await createOrganizationOnServer();

      const byIdResponse = await request(url)
        .post('')
        .send(getReadOrganizationByIdQuery(createdOrganization.orgId));

      expect(byIdResponse.status).toBe(200);
      expect(byIdResponse.body.data.readOrganizationById.orgId).toBe(createdOrganization.orgId);

      const bySlugResponse = await request(url)
        .post('')
        .send(getReadOrganizationBySlugQuery(createdOrganization.slug));

      expect(bySlugResponse.status).toBe(200);
      expect(bySlugResponse.body.data.readOrganizationBySlug.slug).toBe(createdOrganization.slug);
    });

    it('updates an organization with valid input', async () => {
      const createdOrganization = await createOrganizationOnServer();

      const response = await request(url)
        .post('')
        .set('token', adminUser.token)
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
        expect.arrayContaining([{orgId: createdOrganization.orgId}].map((org) => expect.objectContaining(org))),
      );

      const options = {filters: [{field: 'name', value: createdOrganization.name}]};
      const filteredResponse = await request(url)
        .post('')
        .send(getReadOrganizationsWithOptionsQuery(options));

      expect(filteredResponse.status).toBe(200);
      const filteredList = filteredResponse.body.data.readOrganizations;
      expect(filteredList).toEqual(
        expect.arrayContaining([{orgId: createdOrganization.orgId}].map((org) => expect.objectContaining(org))),
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

    it('returns 404 when updating non-existent organization', async () => {
      const response = await request(url)
        .post('')
        .set('token', adminUser.token)
        .send(
          getUpdateOrganizationMutation({
            orgId: new Types.ObjectId().toString(),
            description: 'ghost',
          }),
        );

      expect(response.status).toBe(404);
    });

    it('returns 404 when reading a missing slug', async () => {
      const response = await request(url)
        .post('')
        .send(getReadOrganizationBySlugQuery('missing-slug'));

      expect(response.status).toBe(404);
    });
  });
});
