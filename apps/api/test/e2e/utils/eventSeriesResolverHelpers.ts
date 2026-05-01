import request from 'supertest';
import type { OrganizationRole } from '@gatherle/commons/types';
import type { CreateEventInput } from '@gatherle/commons/types';
import {
  getCreateEventMutation,
  getCreateOrganizationMutation,
  getCreateOrganizationMembershipMutation,
  getReadEventBySlugQuery,
  getReadOrganizationBySlugQuery,
  getUpdateOrganizationMembershipMutation,
} from '@/test/utils';

type GraphQLResponseError = {
  message?: string;
  extensions?: {
    code?: string;
  };
};

type CleanupRequestFactory = (id: string) => object;
type CleanupToken = string | (() => string);

export type CleanupFailure = {
  label: string;
  id: string;
  reason: string;
};

export type CleanupTrackedEntitiesOptions = {
  url: string;
  ids: string[];
  deleteRequest: CleanupRequestFactory;
  token: CleanupToken;
  label: string;
  phase?: string;
};

export type CreatedEventRef = {
  eventId: string;
  slug: string;
  title: string;
};

export type OrganizationRef = {
  orgId: string;
  slug?: string;
  name?: string;
};

export type OrganizationMembershipRef = {
  membershipId: string;
  orgId?: string;
  userId?: string;
  role?: OrganizationRole;
};

export const trackCreatedId = (ids: string[], id: string) => {
  if (!ids.includes(id)) {
    ids.push(id);
  }
};

export const untrackCreatedId = (ids: string[], id: string) => {
  const index = ids.indexOf(id);
  if (index >= 0) {
    ids.splice(index, 1);
  }
};

const readCleanupToken = (token: CleanupToken): string => (typeof token === 'function' ? token() : token);

const readGraphQLErrors = (body: { errors?: GraphQLResponseError[] } | undefined): GraphQLResponseError[] =>
  Array.isArray(body?.errors) ? body.errors : [];

const readErrorCode = (errors: GraphQLResponseError[]): string | undefined =>
  errors.find((error) => error.extensions?.code)?.extensions?.code;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const hasRetryableMessage = (value: unknown): boolean =>
  typeof value === 'string' && /(endpoint request timed out|timed out|timeout|temporarily unavailable)/i.test(value);

const isRetryableGraphQLFailure = (status: number, body: unknown): boolean => {
  if (status === 429 || status >= 500) {
    return true;
  }

  if (!body || typeof body !== 'object') {
    return false;
  }

  const graphQLBody = body as {
    message?: unknown;
    errors?: Array<{ message?: unknown }>;
  };

  if (hasRetryableMessage(graphQLBody.message)) {
    return true;
  }

  return Array.isArray(graphQLBody.errors) && graphQLBody.errors.some((error) => hasRetryableMessage(error.message));
};

const isRetryableRequestError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /(ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|timeout)/i.test(error.message);
};

const readConflictSlug = (errors: GraphQLResponseError[], input: CreateEventInput): string | null => {
  const message = errors.find((error) => typeof error.message === 'string')?.message ?? '';
  const slugFromMessage = message.match(/Slug ([^ ]+) already exists/i)?.[1];
  if (slugFromMessage) {
    return slugFromMessage;
  }

  if (readErrorCode(errors) === 'CONFLICT' && input.title) {
    return input.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  return null;
};

const tryReadEventBySlug = async (
  url: string,
  slug: string,
  userToken: string,
  createdEventIds: string[],
): Promise<CreatedEventRef | null> => {
  try {
    const response = await request(url)
      .post('')
      .timeout({ response: 15_000, deadline: 20_000 })
      .set('Authorization', 'Bearer ' + userToken)
      .send(getReadEventBySlugQuery(slug));

    const createdEvent = response.body.data?.readEventBySlug as CreatedEventRef | undefined;
    if (response.status === 200 && !response.body.errors && createdEvent?.eventId) {
      trackCreatedId(createdEventIds, createdEvent.eventId);
      return createdEvent;
    }
  } catch {
    // Ignore recovery failures and let the original create error surface.
  }

  return null;
};

const tryReadOrganizationBySlug = async (
  url: string,
  slug: string,
  adminToken: string,
  createdOrgIds: string[],
): Promise<OrganizationRef | null> => {
  try {
    const response = await request(url)
      .post('')
      .timeout({ response: 15_000, deadline: 20_000 })
      .set('Authorization', 'Bearer ' + adminToken)
      .send(getReadOrganizationBySlugQuery(slug));

    const organization = response.body.data?.readOrganizationBySlug as OrganizationRef | undefined;
    if (response.status === 200 && !response.body.errors && organization?.orgId) {
      trackCreatedId(createdOrgIds, organization.orgId);
      return organization;
    }
  } catch {
    // Ignore recovery failures and let the original create error surface.
  }

  return null;
};

const isNotFoundResponse = (status: number, errors: GraphQLResponseError[]): boolean =>
  status === 404 || errors.some((error) => error.extensions?.code === 'NOT_FOUND');

const formatCleanupFailure = (status: number, errors: GraphQLResponseError[]): string => {
  if (errors.length === 0) {
    return `status=${status}`;
  }

  const errorSummary = errors
    .map((error) => [error.extensions?.code, error.message].filter(Boolean).join(': '))
    .join('; ');
  return `status=${status}, errors=${errorSummary}`;
};

export const cleanupTrackedEntities = async ({
  url,
  ids,
  deleteRequest,
  token,
  label,
  phase = 'cleanup',
}: CleanupTrackedEntitiesOptions): Promise<CleanupFailure[]> => {
  const toDelete = [...ids];
  const failures: CleanupFailure[] = [];
  ids.length = 0;

  await Promise.all(
    toDelete.map(async (id) => {
      try {
        const response = await request(url)
          .post('')
          .set('Authorization', 'Bearer ' + readCleanupToken(token))
          .send(deleteRequest(id));
        const errors = readGraphQLErrors(response.body);

        if ((response.status === 200 && errors.length === 0) || isNotFoundResponse(response.status, errors)) {
          return;
        }

        const reason = formatCleanupFailure(response.status, errors);
        console.warn(`[${phase}] Failed to delete ${label} ${id}: ${reason}`);
        trackCreatedId(ids, id);
        failures.push({ label, id, reason });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[${phase}] Error deleting ${label} ${id}:`, err);
        trackCreatedId(ids, id);
        failures.push({ label, id, reason });
      }
    }),
  );

  return failures;
};

export const assertNoCleanupFailures = (failures: CleanupFailure[]) => {
  if (failures.length === 0) {
    return;
  }

  const summary = failures.map((failure) => `${failure.label} ${failure.id}: ${failure.reason}`).join('; ');
  throw new Error(`Failed to clean up e2e test data: ${summary}`);
};

export const createEventOnServer = async (
  url: string,
  userToken: string,
  input: CreateEventInput,
  createdEventIds: string[],
): Promise<CreatedEventRef> => {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await request(url)
        .post('')
        .timeout({ response: 20_000, deadline: 30_000 })
        .set('Authorization', 'Bearer ' + userToken)
        .send(getCreateEventMutation(input));

      if (response.status === 200 && !response.body.errors && response.body.data?.createEvent?.eventId) {
        const createdEvent = response.body.data.createEvent as CreatedEventRef;
        trackCreatedId(createdEventIds, createdEvent.eventId);
        return createdEvent;
      }

      const errors = readGraphQLErrors(response.body);
      const conflictSlug = readConflictSlug(errors, input);
      if (conflictSlug) {
        const recoveredEvent = await tryReadEventBySlug(url, conflictSlug, userToken, createdEventIds);
        if (recoveredEvent) {
          return recoveredEvent;
        }
      }

      const failureMessage = `Failed to create event: ${JSON.stringify(response.body.errors ?? response.body)}`;
      const shouldRetry = attempt < maxAttempts && isRetryableGraphQLFailure(response.status, response.body);

      if (shouldRetry) {
        console.warn(`[createEventOnServer] transient failure on attempt ${attempt}/${maxAttempts}: ${failureMessage}`);
        await sleep(750 * attempt);
        continue;
      }

      throw new Error(failureMessage);
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isRetryableRequestError(error);
      if (shouldRetry) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[createEventOnServer] transient request error on attempt ${attempt}/${maxAttempts}: ${message}`);
        await sleep(750 * attempt);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Failed to create event after retrying transient errors.');
};

export const createOrganizationOnServer = async (
  url: string,
  adminToken: string,
  ownerId: string,
  name: string,
  createdOrgIds: string[],
): Promise<OrganizationRef> => {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await request(url)
        .post('')
        .timeout({ response: 20_000, deadline: 30_000 })
        .set('Authorization', 'Bearer ' + adminToken)
        .send(
          getCreateOrganizationMutation({
            name,
            ownerId,
          }),
        );

      if (response.status === 200 && !response.body.errors && response.body.data?.createOrganization?.orgId) {
        const organization = response.body.data.createOrganization as OrganizationRef;
        trackCreatedId(createdOrgIds, organization.orgId);
        return organization;
      }

      const errors = readGraphQLErrors(response.body);
      const failureMessage = `Failed to create organization: ${JSON.stringify(response.body.errors ?? response.body)}`;
      const slugFromMessage = errors
        .find((error) => typeof error.message === 'string')
        ?.message?.match(/Slug ([^ ]+) already exists/i)?.[1];
      const organizationSlug =
        slugFromMessage ??
        name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      if ((response.status === 409 || readErrorCode(errors) === 'CONFLICT') && organizationSlug) {
        const recoveredOrganization = await tryReadOrganizationBySlug(url, organizationSlug, adminToken, createdOrgIds);
        if (recoveredOrganization) {
          return recoveredOrganization;
        }
      }

      const shouldRetry = attempt < maxAttempts && isRetryableGraphQLFailure(response.status, response.body);
      if (shouldRetry) {
        await sleep(750 * attempt);
        continue;
      }

      throw new Error(failureMessage);
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isRetryableRequestError(error);
      if (shouldRetry) {
        await sleep(750 * attempt);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Failed to create organization after retrying transient errors.');
};

export const createMembershipOnServer = async (
  url: string,
  adminToken: string,
  orgId: string,
  userId: string,
  role: OrganizationRole,
  createdMembershipIds: string[],
): Promise<OrganizationMembershipRef> => {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await request(url)
        .post('')
        .timeout({ response: 20_000, deadline: 30_000 })
        .set('Authorization', 'Bearer ' + adminToken)
        .send(
          getCreateOrganizationMembershipMutation({
            orgId,
            userId,
            role,
          }),
        );

      if (
        response.status === 200 &&
        !response.body.errors &&
        response.body.data?.createOrganizationMembership?.membershipId
      ) {
        const membership = response.body.data.createOrganizationMembership as OrganizationMembershipRef;
        trackCreatedId(createdMembershipIds, membership.membershipId);
        return membership;
      }

      const failureMessage = `Failed to create membership: ${JSON.stringify(response.body.errors ?? response.body)}`;
      const shouldRetry = attempt < maxAttempts && isRetryableGraphQLFailure(response.status, response.body);
      if (shouldRetry) {
        await sleep(750 * attempt);
        continue;
      }

      throw new Error(failureMessage);
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && isRetryableRequestError(error);
      if (shouldRetry) {
        await sleep(750 * attempt);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Failed to create membership after retrying transient errors.');
};

export const updateMembershipRoleOnServer = async (
  url: string,
  adminToken: string,
  membershipId: string,
  role: OrganizationRole,
) => {
  const response = await request(url)
    .post('')
    .set('Authorization', 'Bearer ' + adminToken)
    .send(
      getUpdateOrganizationMembershipMutation({
        membershipId,
        role,
      }),
    );

  if (response.status !== 200 || response.body.errors || !response.body.data?.updateOrganizationMembership) {
    throw new Error(`Failed to update membership: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  return response.body.data.updateOrganizationMembership;
};
