import request from 'supertest';
import { Types } from 'mongoose';
import type { IntegrationServer } from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer } from '@/test/integration/utils/server';
import type { UserWithToken } from '@ntlango/commons/types';
import { OrganizationRole } from '@ntlango/commons/types';
import {
  getCreateOrganizationMutation,
  getDeleteOrganizationByIdMutation,
  getDeleteOrganizationMembershipMutation,
  getReadMyOrganizationsQuery,
  getReadOrganizationByIdQuery,
  getReadOrganizationBySlugQuery,
  getReadOrganizationsQuery,
  getReadOrganizationsWithOptionsQuery,
  getUpdateOrganizationMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser } from '@/test/integration/utils/helpers';
import { createMembershipOnServer, createOrganizationOnServer } from '@/test/integration/utils/eventResolverHelpers';

type TrackedOrg = { orgId: string; token: string };
type TrackedMembership = { membershipId: string; token: string };

describe('Organization Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5003;
  let adminUser: UserWithToken;
  let testUser: UserWithToken;
  const createdOrgs: TrackedOrg[] = [];
  const createdMemberships: TrackedMembership[] = [];
  const randomId = () => Math.random().toString(36).slice(2, 8);

  const buildOrganizationInput = (name: string) => ({
    name,
    ownerId: adminUser.userId,
  });

  const trackOrg = (orgId: string, token: string) => {
    if (!createdOrgs.some((org) => org.orgId === orgId)) {
      createdOrgs.push({ orgId, token });
    }
  };

  const trackMembership = (membershipId: string, token: string) => {
    if (!createdMemberships.some((membership) => membership.membershipId === membershipId)) {
      createdMemberships.push({ membershipId, token });
    }
  };

  const createOrganization = async (token: string, ownerUserId: string, name: string) => {
    const trackedOrgIds: string[] = [];
    const org = await createOrganizationOnServer(url, token, ownerUserId, name, trackedOrgIds);
    trackOrg(org.orgId, token);
    return org;
  };

  const createMembership = async (token: string, orgId: string, userId: string, role: OrganizationRole) => {
    const trackedMembershipIds: string[] = [];
    const membership = await createMembershipOnServer(url, token, orgId, userId, role, trackedMembershipIds);
    trackMembership(membership.membershipId, token);
    return membership;
  };

  beforeAll(async () => {
    server = await startIntegrationServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
    testUser = await loginSeededUser(url, seededUsers.user.email, seededUsers.user.password);
  });

  afterAll(async () => {
    if (server) {
      await stopIntegrationServer(server);
    }
  });

  afterEach(async () => {
    await Promise.all(
      createdMemberships.map(({ membershipId, token }) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + token)
          .send(getDeleteOrganizationMembershipMutation({ membershipId }))
          .catch(() => {}),
      ),
    );
    createdMemberships.length = 0;

    await Promise.all(
      createdOrgs.map(({ orgId, token }) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + token)
          .send(getDeleteOrganizationByIdMutation(orgId))
          .catch(() => {}),
      ),
    );
    createdOrgs.length = 0;
  });

  describe('Positive', () => {
    it('creates a new organization with valid input', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput(`create-org-${randomId()}`)));

      expect(response.status).toBe(200);
      expect(response.body.data.createOrganization).toHaveProperty('orgId');
      trackOrg(response.body.data.createOrganization.orgId, adminUser.token);
    });

    it('reads organization by id and slug after creation', async () => {
      const createdOrganization = await createOrganization(
        adminUser.token,
        adminUser.userId,
        `integration-org-${randomId()}`,
      );
      expect(createdOrganization.slug).toBeDefined();
      const createdSlug = createdOrganization.slug as string;

      const byIdResponse = await request(url).post('').send(getReadOrganizationByIdQuery(createdOrganization.orgId));

      expect(byIdResponse.status).toBe(200);
      expect(byIdResponse.body.data.readOrganizationById.orgId).toBe(createdOrganization.orgId);

      const bySlugResponse = await request(url).post('').send(getReadOrganizationBySlugQuery(createdSlug));

      expect(bySlugResponse.status).toBe(200);
      expect(bySlugResponse.body.data.readOrganizationBySlug.slug).toBe(createdSlug);
    });

    it('updates an organization with valid input', async () => {
      const createdOrganization = await createOrganization(
        adminUser.token,
        adminUser.userId,
        `org-update-${randomId()}`,
      );

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
      const createdOrganization = await createOrganization(adminUser.token, adminUser.userId, `org-list-${randomId()}`);

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
      await createOrganization(adminUser.token, adminUser.userId, `org-page-1-${randomId()}`);
      await createOrganization(adminUser.token, adminUser.userId, `org-page-2-${randomId()}`);

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
      await createOrganization(adminUser.token, adminUser.userId, `org-sort-${randomId()}`);

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
      const testName = `Test Organization Name ${randomId()}`;
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput(testName)));

      expect(response.status).toBe(200);
      expect(response.body.data.createOrganization.name).toBe(testName);
      trackOrg(response.body.data.createOrganization.orgId, adminUser.token);
    });

    it('returns the user’s organizations with associated roles', async () => {
      const org1 = await createOrganization(testUser.token, testUser.userId, `read-my-org-1-${randomId()}`);
      await createMembership(testUser.token, org1.orgId, adminUser.userId, OrganizationRole.Admin);

      const org2 = await createOrganization(testUser.token, testUser.userId, `read-my-org-2-${randomId()}`);
      await createMembership(testUser.token, org2.orgId, adminUser.userId, OrganizationRole.Member);

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
    it('requires auth token to create organization', async () => {
      const response = await request(url)
        .post('')
        .send(getCreateOrganizationMutation(buildOrganizationInput(`unauthorized-org-${randomId()}`)));

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
            name: `owner-override-${randomId()}`,
            ownerId: 'invalid-id',
          }),
        );

      expect(response.status).toBe(200);
      const organization = response.body.data.createOrganization;
      expect(organization.ownerId).toBe(adminUser.userId);
      trackOrg(organization.orgId, adminUser.token);
    });

    it('returns conflict when duplicate organization name is used', async () => {
      const orgName = `duplicate-org-${randomId()}`;
      const createdOrganization = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getCreateOrganizationMutation(buildOrganizationInput(orgName)));
      trackOrg(createdOrganization.body.data.createOrganization.orgId, adminUser.token);

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
      const createdOrganization = await createOrganization(
        adminUser.token,
        adminUser.userId,
        `org-no-auth-${randomId()}`,
      );

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
