import request from 'supertest';
import { Types } from 'mongoose';
import { kebabCase } from 'lodash';
import type { IntegrationServer } from '@/test/integration/utils/server';
import { startIntegrationServer, stopIntegrationServer } from '@/test/integration/utils/server';
import type { QueryOptionsInput, UserWithToken } from '@ntlango/commons/types';
import { SortOrderInput } from '@ntlango/commons/types';
import {
  getCreateEventCategoryMutation,
  getDeleteEventCategoryByIdMutation,
  getReadEventCategoryByIdQuery,
  getReadEventCategoryBySlugQuery,
  getReadEventCategoriesQuery,
  getReadEventCategoriesWithOptionsQuery,
  getUpdateEventCategoryMutation,
} from '@/test/utils';
import { getSeededTestUsers, loginSeededUser } from '@/test/integration/utils/helpers';
import {
  buildEventCategoryInput,
  createEventCategoryOnServer,
} from '@/test/integration/utils/eventCategoryResolverHelpers';

describe('EventCategory Resolver', () => {
  let server: IntegrationServer;
  let url = '';
  const TEST_PORT = 5001;
  let adminUser: UserWithToken;
  const createdCategoryIds: string[] = [];

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
      createdCategoryIds.map((eventCategoryId) =>
        request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getDeleteEventCategoryByIdMutation(eventCategoryId))
          .catch(() => {}),
      ),
    );
    createdCategoryIds.length = 0;
  });

  describe('Positive', () => {
    describe('createEventCategory Mutation', () => {
      it('should create a new event category when input is valid', async () => {
        const input = buildEventCategoryInput();
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getCreateEventCategoryMutation(input));

        expect(response.status).toBe(200);
        expect(response.error).toBeFalsy();
        const createdEventCategory = response.body.data.createEventCategory;
        createdCategoryIds.push(createdEventCategory.eventCategoryId);
        expect(createdEventCategory).toHaveProperty('eventCategoryId');
        expect(createdEventCategory.name).toBe(input.name);
      });
    });

    describe('updateEventCategory Mutation', () => {
      it('should update an existing category when valid input is provided', async () => {
        const input = buildEventCategoryInput();
        const createdCategory = await createEventCategoryOnServer(url, adminUser.token, input, createdCategoryIds);
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
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
      it('should read category by id', async () => {
        const input = buildEventCategoryInput();
        const createdCategory = await createEventCategoryOnServer(url, adminUser.token, input, createdCategoryIds);
        const response = await request(url)
          .post('')
          .send(getReadEventCategoryByIdQuery(createdCategory.eventCategoryId));

        expect(response.status).toBe(200);
        expect(response.body.data.readEventCategoryById.slug).toBe(kebabCase(input.name));
      });

      it('should read all categories without options', async () => {
        const createdCategory = await createEventCategoryOnServer(
          url,
          adminUser.token,
          buildEventCategoryInput(),
          createdCategoryIds,
        );
        const response = await request(url).post('').send(getReadEventCategoriesQuery());

        expect(response.status).toBe(200);
        const categories = response.body.data.readEventCategories;
        const ourCategory = categories.find(
          (category: any) => category.eventCategoryId === createdCategory.eventCategoryId,
        );
        expect(ourCategory).toBeDefined();
      });

      it('should read categories list with options', async () => {
        const input = buildEventCategoryInput();
        const createdCategory = await createEventCategoryOnServer(url, adminUser.token, input, createdCategoryIds);
        const options: QueryOptionsInput = { filters: [{ field: 'name', value: input.name }] };
        const response = await request(url).post('').send(getReadEventCategoriesWithOptionsQuery(options));

        expect(response.status).toBe(200);
        const categories = response.body.data.readEventCategories;
        const ourCategory = categories.find(
          (category: any) => category.eventCategoryId === createdCategory.eventCategoryId,
        );
        expect(ourCategory).toBeDefined();
      });

      it('should read category by slug', async () => {
        const input = buildEventCategoryInput();
        const createdCategory = await createEventCategoryOnServer(url, adminUser.token, input, createdCategoryIds);
        const response = await request(url).post('').send(getReadEventCategoryBySlugQuery(createdCategory.slug));

        expect(response.status).toBe(200);
        expect(response.body.data.readEventCategoryBySlug.eventCategoryId).toBe(createdCategory.eventCategoryId);
      });

      it('should resolve interested users count for category', async () => {
        const createdCategory = await createEventCategoryOnServer(
          url,
          adminUser.token,
          buildEventCategoryInput(),
          createdCategoryIds,
        );

        const response = await request(url).post('').send(getReadEventCategoryBySlugQuery(createdCategory.slug));

        expect(response.status).toBe(200);
        expect(response.body.data.readEventCategoryBySlug.interestedUsersCount).toBe(0);
      });

      it('should read categories with pagination', async () => {
        await createEventCategoryOnServer(url, adminUser.token, buildEventCategoryInput(), createdCategoryIds);
        const options: QueryOptionsInput = { pagination: { skip: 0, limit: 5 } };
        const response = await request(url).post('').send(getReadEventCategoriesWithOptionsQuery(options));

        expect(response.status).toBe(200);
        const categories = response.body.data.readEventCategories;
        expect(categories.length).toBeLessThanOrEqual(5);
      });

      it('should read categories with sort', async () => {
        await createEventCategoryOnServer(url, adminUser.token, buildEventCategoryInput(), createdCategoryIds);
        const options: QueryOptionsInput = {
          sort: [{ field: 'name', order: SortOrderInput.asc }],
        };
        const response = await request(url).post('').send(getReadEventCategoriesWithOptionsQuery(options));

        expect(response.status).toBe(200);
        const categories = response.body.data.readEventCategories;
        if (categories.length > 1) {
          const names = categories.map((c: any) => c.name);
          const sortedNames = [...names].sort();
          expect(names).toEqual(sortedNames);
        }
      });
    });
  });

  describe('Negative', () => {
    describe('createEventCategory Mutation', () => {
      it('should require admin authorization', async () => {
        const response = await request(url).post('').send(getCreateEventCategoryMutation(buildEventCategoryInput()));
        expect(response.status).toBe(401);
      });

      it('should return conflict for duplicate category name', async () => {
        const input = buildEventCategoryInput();

        await createEventCategoryOnServer(url, adminUser.token, input, createdCategoryIds);

        const duplicateResponse = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(getCreateEventCategoryMutation(input));

        expect(duplicateResponse.status).toBe(409);
      });

      it('should return validation error for missing name', async () => {
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(
            getCreateEventCategoryMutation({
              ...buildEventCategoryInput(),
              name: '',
            }),
          );

        expect(response.status).toBe(400);
      });

      it('should return validation error for missing icon name', async () => {
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(
            getCreateEventCategoryMutation({
              ...buildEventCategoryInput(),
              iconName: '',
            }),
          );

        expect(response.status).toBe(400);
      });
    });

    describe('updateEventCategory Mutation', () => {
      it('should return not found for non-existent category', async () => {
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + adminUser.token)
          .send(
            getUpdateEventCategoryMutation({
              eventCategoryId: new Types.ObjectId().toString(),
              iconName: 'ghost',
            }),
          );
        expect(response.status).toBe(404);
      });

      it('should require authentication', async () => {
        const createdCategory = await createEventCategoryOnServer(
          url,
          adminUser.token,
          buildEventCategoryInput(),
          createdCategoryIds,
        );

        const response = await request(url)
          .post('')
          .send(
            getUpdateEventCategoryMutation({
              eventCategoryId: createdCategory.eventCategoryId,
              iconName: 'no-auth',
            }),
          );

        expect(response.status).toBe(401);
      });
    });

    describe('readEventCategory Queries', () => {
      it('should return not found for missing slug', async () => {
        const response = await request(url).post('').send(getReadEventCategoryBySlugQuery('missing'));
        expect(response.status).toBe(404);
      });

      it('should return not found for non-existent id', async () => {
        const response = await request(url)
          .post('')
          .send(getReadEventCategoryByIdQuery(new Types.ObjectId().toString()));

        expect(response.status).toBe(404);
      });
    });
  });
});
