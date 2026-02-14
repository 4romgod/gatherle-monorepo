import request from 'supertest';
import type { CreateEventCategoryInput } from '@ntlango/commons/types';
import { getCreateEventCategoryMutation } from '@/test/utils';
import { trackCreatedId } from './eventResolverHelpers';

export type CreatedEventCategoryRef = {
  eventCategoryId: string;
  slug: string;
  name: string;
};

export const randomId = () => Math.random().toString(36).slice(2, 7);

export const buildEventCategoryInput = (suffix = randomId()): CreateEventCategoryInput => {
  const name = `testEventCategory-${Date.now()}-${suffix}`;
  return {
    name,
    description: `Test Event Category ${suffix}`,
    iconName: `testIcon${suffix}`,
    color: `testColor${suffix}`,
  };
};

export const createEventCategoryOnServer = async (
  url: string,
  adminToken: string,
  input: CreateEventCategoryInput,
  createdCategoryIds: string[],
): Promise<CreatedEventCategoryRef> => {
  const response = await request(url)
    .post('')
    .set('Authorization', 'Bearer ' + adminToken)
    .send(getCreateEventCategoryMutation(input));

  if (response.status !== 200 || response.body.errors || !response.body.data?.createEventCategory?.eventCategoryId) {
    throw new Error(`Failed to create event category: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  const createdCategory = response.body.data.createEventCategory as CreatedEventCategoryRef;
  trackCreatedId(createdCategoryIds, createdCategory.eventCategoryId);
  return createdCategory;
};
