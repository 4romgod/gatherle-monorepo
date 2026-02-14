import request from 'supertest';
import type { OrganizationRole } from '@ntlango/commons/types';
import type { CreateEventInput } from '@ntlango/commons/types';
import {
  getCreateEventMutation,
  getCreateOrganizationMutation,
  getCreateOrganizationMembershipMutation,
  getUpdateOrganizationMembershipMutation,
} from '@/test/utils';

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
