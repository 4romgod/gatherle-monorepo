import request from 'supertest';
import {Types} from 'mongoose';
import {kebabCase} from 'lodash';
import {IntegrationServer, startIntegrationServer, stopIntegrationServer} from '@/test/integration/utils/server';
import {EventCategoryDAO} from '@/mongodb/dao';
import {usersMockData} from '@/mongodb/mockData';
import {generateToken} from '@/utils/auth';
import {CreateEventCategoryInput, QueryOptionsInput, UserRole, User, UserWithToken} from '@ntlango/commons/types';
import {
  getCreateEventCategoryMutation,
  getReadEventCategoryByIdQuery,
  getReadEventCategoryBySlugQuery,
  getReadEventCategoriesQuery,
  getReadEventCategoriesWithOptionsQuery,
  getUpdateEventCategoryMutation,
} from '@/test/utils';

describe('EventCategory Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5001;
  let adminUser: UserWithToken;
  const testEventCategorySlug = kebabCase('testEventCategory');

  const createEventCategoryInput: CreateEventCategoryInput = {
    name: 'testEventCategory',
    description: 'Test Event Category',
    iconName: 'testIcon',
    color: 'testColor',
  };

  beforeAll(async () => {
    server = await startIntegrationServer({port: TEST_PORT});
    url = server.url;
    const user = {
      ...usersMockData[0],
      userId: new Types.ObjectId().toString(),
      userRole: UserRole.Admin,
      email: 'admin@example.com',
      username: 'adminUser',
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

  describe('Positive', () => {
    describe('createEventCategory Mutation', () => {
      afterEach(async () => {
        await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
      });

      it('should create a new event category when input is valid', async () => {
        const response = await request(url)
          .post('')
          .set('token', adminUser.token)
          .send(getCreateEventCategoryMutation(createEventCategoryInput));

        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        const createdEventCategory = response.body.data.createEventCategory;
        expect(createdEventCategory).toHaveProperty('eventCategoryId');
        expect(createdEventCategory.name).toBe(createEventCategoryInput.name);
      });
    });

    describe('updateEventCategory Mutation', () => {
      afterEach(async () => {
        await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
      });

      it('should update an existing category when valid input is provided', async () => {
        const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);
        const response = await request(url)
          .post('')
          .set('token', adminUser.token)
          .send(
            getUpdateEventCategoryMutation({
              eventCategoryId: createdCategory.eventCategoryId,
              iconName: 'updated',
            }),
          );

        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        const updatedEventCategory = response.body.data.updateEventCategory;
        expect(updatedEventCategory.iconName).toBe('updated');
      });
    });

    describe('readEventCategory Queries', () => {
      afterEach(async () => {
        await EventCategoryDAO.deleteEventCategoryBySlug(testEventCategorySlug);
      });

      it('should read category by id', async () => {
        const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);
        const response = await request(url).post('').send(getReadEventCategoryByIdQuery(createdCategory.eventCategoryId));

        expect(response.status).toBe(200);
        expect(response.body.data.readEventCategoryById.slug).toBe(testEventCategorySlug);
      });

      it('should read all categories without options', async () => {
        await EventCategoryDAO.create(createEventCategoryInput);
        const response = await request(url).post('').send(getReadEventCategoriesQuery());

        expect(response.status).toBe(200);
        const categories = response.body.data.readEventCategories;
        const ourCategory = categories.find((category: any) => category.slug === testEventCategorySlug);
        expect(ourCategory).toBeDefined();
      });

      it('should read categories list with options', async () => {
        const createdCategory = await EventCategoryDAO.create(createEventCategoryInput);
        const options: QueryOptionsInput = {filters: [{field: 'name', value: createEventCategoryInput.name}]};
        const response = await request(url).post('').send(getReadEventCategoriesWithOptionsQuery(options));

        expect(response.status).toBe(200);
        const categories = response.body.data.readEventCategories;
        const ourCategory = categories.find((category: any) => category.slug === testEventCategorySlug);
        expect(ourCategory).toBeDefined();
      });
    });
  });

  describe('Negative', () => {
    describe('createEventCategory Mutation', () => {
      it('should require admin authorization', async () => {
        const response = await request(url).post('').send(getCreateEventCategoryMutation(createEventCategoryInput));
        expect(response.status).toBe(401);
      });
    });

    describe('updateEventCategory Mutation', () => {
      it('should return not found for non-existent category', async () => {
        const response = await request(url)
          .post('')
          .set('token', adminUser.token)
          .send(
            getUpdateEventCategoryMutation({
              eventCategoryId: new Types.ObjectId().toString(),
              iconName: 'ghost',
            }),
          );
        expect(response.status).toBe(404);
      });
    });

    describe('readEventCategory Queries', () => {
      it('should return not found for missing slug', async () => {
        const response = await request(url).post('').send(getReadEventCategoryBySlugQuery('missing'));
        expect(response.status).toBe(404);
      });
    });
  });
});
