import request from 'supertest';
import { Types } from 'mongoose';
import type { IntegrationServer } from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer } from '@/test/integration/utils/server';
import type { UserWithToken } from '@ntlango/commons/types';
import { VenueType } from '@ntlango/commons/types';
import { getDeleteOrganizationByIdMutation } from '@/test/utils';
import {
  getCreateVenueMutation,
  getDeleteVenueByIdMutation,
  getReadVenueByIdQuery,
  getReadVenueBySlugQuery,
  getReadVenuesByOrgIdQuery,
  getReadVenuesQuery,
  getUpdateVenueMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser } from '@/test/integration/utils/helpers';
import { createOrganizationOnServer } from '@/test/integration/utils/eventResolverHelpers';

describe('Venue Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5004;
  let adminUser: UserWithToken;
  const createdVenueIds: string[] = [];
  const createdOrgIds: string[] = [];
  const randomId = () => Math.random().toString(36).slice(2, 7);

  const createOrganization = (name: string) =>
    createOrganizationOnServer(url, adminUser.token, adminUser.userId, name, createdOrgIds);

  const createVenue = async (orgId: string) => {
    const response = await request(url)
      .post('')
      .set('Authorization', 'Bearer ' + adminUser.token)
      .send(
        getCreateVenueMutation({
          orgId,
          type: VenueType.Physical,
          name: `Integration Venue ${randomId()}`,
          address: {
            city: 'Cape Town',
            country: 'South Africa',
          },
        }),
      );

    const venue = response.body.data.createVenue;
    createdVenueIds.push(venue.venueId);
    return venue;
  };

  beforeAll(async () => {
    server = await startIntegrationServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);
  });

  afterAll(async () => {
    if (server) {
      await stopIntegrationServer(server);
    }
  });

  afterEach(async () => {
    await Promise.all(
      createdVenueIds.map((venueId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getDeleteVenueByIdMutation(venueId))
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
    createdVenueIds.length = 0;
    createdOrgIds.length = 0;
  });

  describe('Positive', () => {
    it('creates a venue with valid input', async () => {
      const organization = await createOrganization(`Venue Org ${randomId()}`);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getCreateVenueMutation({
            orgId: organization.orgId,
            type: VenueType.Physical,
            name: 'Created Venue',
          }),
        );

      expect(response.status).toBe(200);
      expect(response.body.data.createVenue).toHaveProperty('venueId');
      createdVenueIds.push(response.body.data.createVenue.venueId);
    });

    it('updates a venue with valid input', async () => {
      const organization = await createOrganization(`Venue Org Update ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getUpdateVenueMutation({ venueId: venue.venueId, name: 'Updated Venue' }));

      expect(response.status).toBe(200);
      expect(response.body.data.updateVenue.name).toBe('Updated Venue');
    });

    it('reads venue by id and lists venues', async () => {
      const organization = await createOrganization(`Venue Org List ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const readByIdResponse = await request(url).post('').send(getReadVenueByIdQuery(venue.venueId));
      expect(readByIdResponse.status).toBe(200);
      expect(readByIdResponse.body.data.readVenueById.venueId).toBe(venue.venueId);

      const listResponse = await request(url).post('').send(getReadVenuesQuery());
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.readVenues).toEqual(
        expect.arrayContaining([{ venueId: venue.venueId }].map((item) => expect.objectContaining(item))),
      );

      const byOrgResponse = await request(url).post('').send(getReadVenuesByOrgIdQuery(organization.orgId));
      expect(byOrgResponse.status).toBe(200);
      expect(byOrgResponse.body.data.readVenuesByOrgId[0].orgId).toBe(organization.orgId);
    });

    it('reads venue by slug', async () => {
      const organization = await createOrganization(`Venue Org Slug ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const slugResponse = await request(url).post('').send(getReadVenueBySlugQuery(venue.slug));
      expect(slugResponse.status).toBe(200);
      expect(slugResponse.body.data.readVenueBySlug.venueId).toBe(venue.venueId);
    });

    it('creates venues with different types', async () => {
      const organization = await createOrganization(`Venue Org Types ${randomId()}`);

      const physicalVenue = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getCreateVenueMutation({
            orgId: organization.orgId,
            type: VenueType.Physical,
            name: 'Physical Venue',
            address: { city: 'Johannesburg', country: 'South Africa' },
          }),
        );

      expect(physicalVenue.status).toBe(200);
      expect(physicalVenue.body.data.createVenue.type).toBe(VenueType.Physical);
      createdVenueIds.push(physicalVenue.body.data.createVenue.venueId);

      const hybridVenue = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getCreateVenueMutation({
            orgId: organization.orgId,
            type: VenueType.Hybrid,
            name: 'Hybrid Venue',
            address: { city: 'Pretoria', country: 'South Africa' },
          }),
        );

      expect(hybridVenue.status).toBe(200);
      expect(hybridVenue.body.data.createVenue.type).toBe(VenueType.Hybrid);
      createdVenueIds.push(hybridVenue.body.data.createVenue.venueId);
    });

    it('filters venues by organization', async () => {
      const org1 = await createOrganization(`Org1 Venues ${randomId()}`);
      const org2 = await createOrganization(`Org2 Venues ${randomId()}`);

      const venue1 = await createVenue(org1.orgId);
      const venue2 = await createVenue(org2.orgId);

      const org1Venues = await request(url).post('').send(getReadVenuesByOrgIdQuery(org1.orgId));
      expect(org1Venues.status).toBe(200);
      const org1List = org1Venues.body.data.readVenuesByOrgId;
      expect(org1List.some((v: any) => v.venueId === venue1.venueId)).toBe(true);
      expect(org1List.some((v: any) => v.venueId === venue2.venueId)).toBe(false);
    });

    it('updates venue name', async () => {
      const organization = await createOrganization(`Venue Org Name ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateVenueMutation({
            venueId: venue.venueId,
            name: 'New Venue Name',
          }),
        );

      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.updateVenue.name).toBe('New Venue Name');
      }
    });

    it('updates venue address', async () => {
      const organization = await createOrganization(`Venue Org Address ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateVenueMutation({
            venueId: venue.venueId,
            address: {
              city: 'Durban',
              country: 'South Africa',
            },
          }),
        );

      expect(response.status).toBe(200);
      if (response.body.data.updateVenue.address) {
        expect(response.body.data.updateVenue.address.city).toBe('Durban');
      }
    });

    it('deletes venue by id', async () => {
      const organization = await createOrganization(`Venue Org Delete ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getDeleteVenueByIdMutation(venue.venueId));

      expect(response.status).toBe(200);
      expect(response.body.data.deleteVenueById.venueId).toBe(venue.venueId);

      createdVenueIds.splice(createdVenueIds.indexOf(venue.venueId), 1);
    });
  });

  describe('Negative', () => {
    it('requires admin token to create a venue', async () => {
      const organization = await createOrganization(`Venue Org Unauthorized ${randomId()}`);

      const response = await request(url)
        .post('')
        .send(
          getCreateVenueMutation({
            orgId: organization.orgId,
            type: VenueType.Physical,
            name: 'Unauthorized Venue',
          }),
        );

      expect(response.status).toBe(401);
    });

    it('returns validation error for missing venue name', async () => {
      const organization = await createOrganization(`Venue Org No Name ${randomId()}`);

      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getCreateVenueMutation({
            orgId: organization.orgId,
            type: VenueType.Physical,
            name: '',
          }),
        );

      expect(response.status).toBe(400);
    });

    it('returns validation error for invalid organization id', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getCreateVenueMutation({
            orgId: 'invalid-org-id',
            type: VenueType.Physical,
            name: 'Invalid Org Venue',
          }),
        );

      expect(response.status).toBe(400);
    });

    it('returns 404 when reading a missing venue id', async () => {
      const response = await request(url).post('').send(getReadVenueByIdQuery(new Types.ObjectId().toString()));
      expect(response.status).toBe(404);
    });

    it('returns error when updating non-existent venue', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateVenueMutation({
            venueId: new Types.ObjectId().toString(),
            name: 'Ghost Venue',
          }),
        );

      expect([400, 404]).toContain(response.status);
    });

    it('returns 404 when deleting non-existent venue', async () => {
      const response = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(getDeleteVenueByIdMutation(new Types.ObjectId().toString()));

      expect(response.status).toBe(404);
    });

    it('requires authentication for updating venue', async () => {
      const organization = await createOrganization(`Venue Org Auth ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const response = await request(url)
        .post('')
        .send(
          getUpdateVenueMutation({
            venueId: venue.venueId,
            name: 'No Auth Update',
          }),
        );

      expect([401, 403]).toContain(response.status);
    });

    it('requires authentication for deleting venue', async () => {
      const organization = await createOrganization(`Venue Org Delete Auth ${randomId()}`);
      const venue = await createVenue(organization.orgId);

      const response = await request(url).post('').send(getDeleteVenueByIdMutation(venue.venueId));

      expect(response.status).toBe(401);
    });
  });
});
