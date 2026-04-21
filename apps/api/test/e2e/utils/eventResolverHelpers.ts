import request from 'supertest';
import type { OrganizationRole } from '@gatherle/commons/types';
import type { CreateEventInput } from '@gatherle/commons/types';
import {
  getCreateEventMutation,
  getCreateOrganizationMutation,
  getCreateOrganizationMembershipMutation,
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
  const response = await request(url)
    .post('')
    .set('Authorization', 'Bearer ' + userToken)
    .send(getCreateEventMutation(input));

  if (response.status !== 200 || response.body.errors || !response.body.data?.createEvent?.eventId) {
    throw new Error(`Failed to create event: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  const createdEvent = response.body.data.createEvent as CreatedEventRef;
  trackCreatedId(createdEventIds, createdEvent.eventId);
  return createdEvent;
};

export const createOrganizationOnServer = async (
  url: string,
  adminToken: string,
  ownerId: string,
  name: string,
  createdOrgIds: string[],
): Promise<OrganizationRef> => {
  const response = await request(url)
    .post('')
    .set('Authorization', 'Bearer ' + adminToken)
    .send(
      getCreateOrganizationMutation({
        name,
        ownerId,
      }),
    );

  if (response.status !== 200 || response.body.errors || !response.body.data?.createOrganization?.orgId) {
    throw new Error(`Failed to create organization: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  const organization = response.body.data.createOrganization as OrganizationRef;
  trackCreatedId(createdOrgIds, organization.orgId);
  return organization;
};

export const createMembershipOnServer = async (
  url: string,
  adminToken: string,
  orgId: string,
  userId: string,
  role: OrganizationRole,
  createdMembershipIds: string[],
): Promise<OrganizationMembershipRef> => {
  const response = await request(url)
    .post('')
    .set('Authorization', 'Bearer ' + adminToken)
    .send(
      getCreateOrganizationMembershipMutation({
        orgId,
        userId,
        role,
      }),
    );

  if (
    response.status !== 200 ||
    response.body.errors ||
    !response.body.data?.createOrganizationMembership?.membershipId
  ) {
    throw new Error(`Failed to create membership: ${JSON.stringify(response.body.errors ?? response.body)}`);
  }

  const membership = response.body.data.createOrganizationMembership as OrganizationMembershipRef;
  trackCreatedId(createdMembershipIds, membership.membershipId);
  return membership;
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
