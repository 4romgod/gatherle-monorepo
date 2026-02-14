import request from 'supertest';
import type { IntegrationServer } from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer } from '@/test/integration/utils/server';
import type { QueryOptionsInput, UserWithToken } from '@ntlango/commons/types';
import {
  getCreateEventCategoryGroupMutation,
  getDeleteEventCategoryGroupBySlugMutation,
  getReadEventCategoryGroupBySlugQuery,
  getReadEventCategoryGroupsQuery,
  getReadEventCategoryGroupsWithOptionsQuery,
  getUpdateEventCategoryGroupMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser } from '@/test/integration/utils/helpers';
import {
  createEventCategoryGroupOnServer,
  readSeededEventCategories,
  type EventCategoryRef,
  uniqueGroupName,
} from '@/test/integration/utils/eventCategoryGroupResolverHelpers';

const TEST_PORT = 5004;

describe('EventCategoryGroup Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  let adminUser: UserWithToken;
  let categories: EventCategoryRef[] = [];
  const createdGroupSlugs: string[] = [];

  const createGroup = async (name: string) => {
    const group = await createEventCategoryGroupOnServer(
      url,
      adminUser.token,
      name,
      categories.map((category) => category.eventCategoryId),
    );
    createdGroupSlugs.push(group.slug);
    return group;
  };

  beforeAll(async () => {
    server = await startIntegrationServer({ port: TEST_PORT });
    url = server.url;

    const seededUsers = getSeededTestUsers();
    adminUser = await loginSeededUser(url, seededUsers.admin.email, seededUsers.admin.password);

    categories = await readSeededEventCategories(url);
  });

  afterAll(async () => {
    if (server) {
      await stopIntegrationServer(server);
    }
  });

  afterEach(async () => {
    await Promise.all(
      createdGroupSlugs.map((slug) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getDeleteEventCategoryGroupBySlugMutation(slug))
          .catch(() => {}),
      ),
    );
    createdGroupSlugs.length = 0;
  });

  describe('Positive', () => {
    it('creates and reads a group', async () => {
      const createdGroup = await createGroup(uniqueGroupName('Test Group'));

      const readResponse = await request(url).post('').send(getReadEventCategoryGroupBySlugQuery(createdGroup.slug));
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.readEventCategoryGroupBySlug.slug).toBe(createdGroup.slug);

      const listResponse = await request(url).post('').send(getReadEventCategoryGroupsQuery());
      const found = listResponse.body.data.readEventCategoryGroups.find(
        (group: any) => group.slug === createdGroup.slug,
      );
      expect(found).toBeTruthy();
    });

    it('populates eventCategories with full category objects on creation', async () => {
      const createdGroup = await createGroup(uniqueGroupName('Populated Group'));

      expect(createdGroup.eventCategories).toBeDefined();
      expect(Array.isArray(createdGroup.eventCategories)).toBe(true);
      expect(createdGroup.eventCategories).toHaveLength(categories.length);

      createdGroup.eventCategories.forEach((category: any) => {
        expect(category).toHaveProperty('eventCategoryId');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('slug');
        expect(category).toHaveProperty('iconName');
        expect(category).toHaveProperty('description');

        const matchingCategory = categories.find((c) => c.eventCategoryId === category.eventCategoryId);
        expect(matchingCategory).toBeDefined();
      });
    });

    it('updates a group', async () => {
      const createdGroup = await createGroup(uniqueGroupName('Editable Group'));
      const updatedName = `Updated Group ${Date.now()}`;

      const updateResponse = await request(url)
        .post('')
        .set('Authorization', 'Bearer ' + adminUser.token)
        .send(
          getUpdateEventCategoryGroupMutation({
            eventCategoryGroupId: createdGroup.eventCategoryGroupId,
            name: updatedName,
            eventCategories: categories.map((category) => category.eventCategoryId),
          }),
        );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.updateEventCategoryGroup.name).toBe(updatedName);
      const updatedSlug = updateResponse.body.data.updateEventCategoryGroup.slug;
      if (updatedSlug && updatedSlug !== createdGroup.slug) {
        createdGroupSlugs.push(updatedSlug);
      }
    });

    it('reads groups with options', async () => {
      const filterGroupName = uniqueGroupName('Filter Group');
      const createdGroup = await createGroup(filterGroupName);
      const options: QueryOptionsInput = { filters: [{ field: 'name', value: filterGroupName }] };
      const response = await request(url).post('').send(getReadEventCategoryGroupsWithOptionsQuery(options));
      expect(response.status).toBe(200);
      const found = response.body.data.readEventCategoryGroups.find((group: any) => group.slug === createdGroup.slug);
      expect(found).toBeTruthy();
    });
  });

  describe('Negative', () => {
    it('rejects creation without auth', async () => {
      const response = await request(url)
        .post('')
        .send(
          getCreateEventCategoryGroupMutation({
            name: uniqueGroupName('Unauthorized Group'),
            eventCategories: categories.map((category) => category.eventCategoryId),
          }),
        );
      expect(response.status).toBe(401);
    });

    it('returns not found for missing slug', async () => {
      const response = await request(url).post('').send(getReadEventCategoryGroupBySlugQuery('missing-slug'));
      expect(response.status).toBe(404);
    });
  });
});
