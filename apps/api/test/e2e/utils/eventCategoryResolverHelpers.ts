import { kebabCase } from 'lodash';
import type { CreateEventCategoryInput } from '@gatherle/commons/types';
import { getCreateEventCategoryMutation, getReadEventCategoryBySlugQuery } from '@/test/utils';
import { trackCreatedId } from './eventSeriesResolverHelpers';

export type CreatedEventCategoryRef = {
  eventCategoryId: string;
  slug: string;
  name: string;
};

type GraphQLCategoryResponse = {
  status: number;
  body: any;
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

const MAX_EVENT_CATEGORY_ATTEMPTS = 5;
const EVENT_CATEGORY_REQUEST_TIMEOUT_MS = 30_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const hasRetryableMessage = (value: unknown): boolean =>
  typeof value === 'string' && /(internal server error|timed out|timeout|temporarily unavailable)/i.test(value);

const isRetryableFailure = (status: number, body: unknown): boolean => {
  if (status === 429 || status >= 500) {
    return true;
  }

  if (!body || typeof body !== 'object') {
    return false;
  }

  const payload = body as {
    message?: unknown;
    errors?: Array<{ message?: unknown }>;
  };

  if (hasRetryableMessage(payload.message)) {
    return true;
  }

  return Array.isArray(payload.errors) && payload.errors.some((error) => hasRetryableMessage(error.message));
};

const isRetryableRequestError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /(ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|timeout|aborted|AbortError)/i.test(error.message);
};

export const postEventCategoryGraphQLWithRetry = async (
  url: string,
  payload: object,
  authToken?: string,
  maxAttempts: number = MAX_EVENT_CATEGORY_ATTEMPTS,
): Promise<GraphQLCategoryResponse> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EVENT_CATEGORY_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = (await response.json()) as any;
      const shouldRetry = attempt < maxAttempts && isRetryableFailure(response.status, body);
      if (shouldRetry) {
        await sleep(500 * attempt);
        continue;
      }

      return {
        status: response.status,
        body,
      };
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isRetryableRequestError(error);
      if (shouldRetry) {
        await sleep(500 * attempt);
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Failed to complete event category request after retrying transient errors.');
};

export const createEventCategoryOnServer = async (
  url: string,
  adminToken: string,
  input: CreateEventCategoryInput,
  createdCategoryIds: string[],
): Promise<CreatedEventCategoryRef> => {
  for (let attempt = 1; attempt <= MAX_EVENT_CATEGORY_ATTEMPTS; attempt++) {
    const response = await postEventCategoryGraphQLWithRetry(url, getCreateEventCategoryMutation(input), adminToken, 1);

    if (response.status === 200 && !response.body.errors && response.body.data?.createEventCategory?.eventCategoryId) {
      const createdCategory = response.body.data.createEventCategory as CreatedEventCategoryRef;
      trackCreatedId(createdCategoryIds, createdCategory.eventCategoryId);
      return createdCategory;
    }

    const failure = JSON.stringify(response.body.errors ?? response.body);
    const slug = kebabCase(input.name);
    const isConflict = response.status === 409 || /already exists/i.test(failure);
    if (isConflict) {
      const existingResponse = await postEventCategoryGraphQLWithRetry(
        url,
        getReadEventCategoryBySlugQuery(slug),
        undefined,
        1,
      );
      const existingCategory = existingResponse.body.data?.readEventCategoryBySlug as
        | CreatedEventCategoryRef
        | undefined;
      if (existingResponse.status === 200 && !existingResponse.body.errors && existingCategory?.eventCategoryId) {
        trackCreatedId(createdCategoryIds, existingCategory.eventCategoryId);
        return existingCategory;
      }
    }

    const shouldRetry = attempt < MAX_EVENT_CATEGORY_ATTEMPTS && isRetryableFailure(response.status, response.body);
    if (shouldRetry) {
      await sleep(500 * attempt);
      continue;
    }

    throw new Error(`Failed to create event category: ${failure}`);
  }

  throw new Error('Failed to create event category after retrying transient errors.');
};
