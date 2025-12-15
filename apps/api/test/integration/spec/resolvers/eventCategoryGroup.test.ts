import request from 'supertest';
import {Types} from 'mongoose';
import {IntegrationServer, startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {EventCategoryDAO, EventCategoryGroupDAO} from '@/mongodb/dao';
import {usersMockData} from '@/mongodb/mockData';
import {generateToken} from '@/utils/auth';
import {UserRole, User, UserWithToken, QueryOptionsInput} from '@ntlango/commons/types';
import {
  getCreateEventCategoryGroupMutation,
  getReadEventCategoryGroupBySlugQuery,
  getReadEventCategoryGroupsQuery,
  getReadEventCategoryGroupsWithOptionsQuery,
  getUpdateEventCategoryGroupMutation,
} from '@/test/utils';
import {EventCategoryGroup} from '@ntlango/commons/types';

const TEST_PORT = 5004;

describe('EventCategoryGroup Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  let adminUser: UserWithToken;
  let categories: any[] = [];
  const uniqueGroupName = (base: string) => `${base}-${new Types.ObjectId().toString().slice(-6)}`;

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
    url = server.url;
    const user = {
      ...usersMockData[0],
      userId: new Types.ObjectId().toString(),
      userRole: UserRole.Admin,
      email: 'group-admin@example.com',
      username: 'groupAdmin',
      interests: undefined,
    } as User;
    const token = await generateToken(user);
    adminUser = {
      ...user,
      token,
    };
    categories = [
      await EventCategoryDAO.create({
        name: 'Group Category A',
        iconName: 'icon-a',
        description: 'A',
      }),
      await EventCategoryDAO.create({
        name: 'Group Category B',
        iconName: 'icon-b',
        description: 'B',
      }),
    ];
  });

  afterAll(async () => {
    await categories.reduce(async (prevPromise, category) => {
      await prevPromise;
      await EventCategoryDAO.deleteEventCategoryBySlug(category.slug);
    }, Promise.resolve());
    await stopIntegrationServer(server);
  });

  const createGroup = async (name: string) => {
    const response = await request(url)
      .post('')
      .set('token', adminUser.token)
      .send(
        getCreateEventCategoryGroupMutation({
          name,
          eventCategoryList: categories.map((category) => category.eventCategoryId),
        }),
      );

    if (!response.body?.data?.createEventCategoryGroup) {
      throw new Error(JSON.stringify(response.body.errors ?? response.body));
    }

    return response.body.data.createEventCategoryGroup as EventCategoryGroup;
  };

  describe('Positive', () => {
    it('creates and reads a group', async () => {
      const createdGroup = await createGroup(uniqueGroupName('Test Group'));

      const readResponse = await request(url).post('').send(getReadEventCategoryGroupBySlugQuery(createdGroup.slug));
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.readEventCategoryGroupBySlug.slug).toBe(createdGroup.slug);

      const listResponse = await request(url).post('').send(getReadEventCategoryGroupsQuery());
      const found = listResponse.body.data.readEventCategoryGroups.find((group: any) => group.slug === createdGroup.slug);
      expect(found).toBeTruthy();

      await EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(createdGroup.slug).catch(() => {});
    });

    it('updates a group', async () => {
      const createdGroup = await createGroup(uniqueGroupName('Editable Group'));
      const updatedName = 'Updated Group';
      const updateResponse = await request(url)
        .post('')
        .set('token', adminUser.token)
        .send(
          getUpdateEventCategoryGroupMutation({
            eventCategoryGroupId: createdGroup.eventCategoryGroupId,
            name: updatedName,
            eventCategoryList: categories.map((category) => category.eventCategoryId),
          }),
        );
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.updateEventCategoryGroup.name).toBe(updatedName);
      await EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(createdGroup.slug).catch(() => {});
    });

    it('reads groups with options', async () => {
      const filterGroupName = uniqueGroupName('Filter Group');
      const createdGroup = await createGroup(filterGroupName);
      const options: QueryOptionsInput = {filters: [{field: 'name', value: filterGroupName}]};
      const response = await request(url).post('').send(getReadEventCategoryGroupsWithOptionsQuery(options));
      expect(response.status).toBe(200);
      const found = response.body.data.readEventCategoryGroups.find((group: any) => group.slug === createdGroup.slug);
      expect(found).toBeTruthy();
      await EventCategoryGroupDAO.deleteEventCategoryGroupBySlug(createdGroup.slug).catch(() => {});
    });
  });

  describe('Negative', () => {
    it('rejects creation without auth', async () => {
      const response = await request(url)
        .post('')
        .send(
          getCreateEventCategoryGroupMutation({
            name: 'Unauthorized Group',
            eventCategoryList: categories.map((category) => category.eventCategoryId),
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
