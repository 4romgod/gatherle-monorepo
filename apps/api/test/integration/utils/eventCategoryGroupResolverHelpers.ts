import request from 'supertest';
import { getCreateEventCategoryGroupMutation, getReadEventCategoriesQuery } from '@/test/utils';

export type EventCategoryRef = {
  eventCategoryId: string;
  name: string;
  slug: string;
  iconName?: string;
  description?: string;
};

export type EventCategoryGroupRef = {
  eventCategoryGroupId: string;
  slug: string;
  name: string;
  eventCategories: EventCategoryRef[];
};

export const uniqueGroupName = (base: string) => `${base}-${Math.random().toString(36).slice(2, 8)}`;

export const readSeededEventCategories = async (url: string): Promise<EventCategoryRef[]> => {
  const response = await request(url).post('').send(getReadEventCategoriesQuery());

  if (response.status !== 200 || response.body.errors) {
    throw new Error(`Failed to read event categories: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  const categories = (response.body.data?.readEventCategories ?? []) as EventCategoryRef[];
  if (categories.length < 2) {
    throw new Error('Expected at least 2 seeded event categories for eventCategoryGroup integration tests.');
  }
  return categories;
};

export const createEventCategoryGroupOnServer = async (
  url: string,
  adminToken: string,
  name: string,
  eventCategoryIds: string[],
): Promise<EventCategoryGroupRef> => {
  const response = await request(url)
    .post('')
    .set('Authorization', 'Bearer ' + adminToken)
    .send(
      getCreateEventCategoryGroupMutation({
        name,
        eventCategories: eventCategoryIds,
      }),
    );

  if (response.status !== 200 || response.body.errors || !response.body.data?.createEventCategoryGroup?.slug) {
    throw new Error(`Failed to create event category group: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  return response.body.data.createEventCategoryGroup as EventCategoryGroupRef;
};
