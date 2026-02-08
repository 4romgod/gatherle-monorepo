'use client';

import { useCallback } from 'react';
import {
  GetOrganizationBySlugDocument,
  GetOrganizationMembershipsByOrgIdDocument,
  CreateOrganizationMembershipDocument,
  UpdateOrganizationDocument,
  UpdateOrganizationMembershipDocument,
  DeleteOrganizationMembershipDocument,
  DeleteOrganizationDocument,
  GetAllUsersDocument,
} from '@/data/graphql/query';
import type {
  Organization,
  OrganizationMembership,
  OrganizationRole,
  QueryOptionsInput,
  User,
} from '@/data/graphql/types/graphql';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import { getAuthHeader } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { OrganizationFormData } from '@/components/organization/settings/types';

const normalizeTags = (tags: string) =>
  tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

export default function useOrganizationSettingsData(slug: string) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data: orgData, loading: orgLoading } = useQuery<{ readOrganizationBySlug: Organization }>(
    GetOrganizationBySlugDocument,
    {
      variables: { slug },
      fetchPolicy: 'cache-and-network',
    },
  );
  const organization = orgData?.readOrganizationBySlug;

  const {
    data: membershipsData,
    loading: membershipsLoading,
    refetch: refetchMemberships,
  } = useQuery<{ readOrganizationMembershipsByOrgId: OrganizationMembership[] }>(
    GetOrganizationMembershipsByOrgIdDocument,
    {
      variables: { orgId: organization?.orgId },
      skip: !organization?.orgId,
      fetchPolicy: 'cache-and-network',
    },
  );
  const memberships = membershipsData?.readOrganizationMembershipsByOrgId ?? [];

  const [searchUsersQuery, { loading: searchLoading }] = useLazyQuery<{ readUsers: User[] }>(GetAllUsersDocument, {
    fetchPolicy: 'network-only',
    context: { headers: getAuthHeader(token) },
  });

  const [updateOrganization, { loading: updateLoading }] = useMutation(UpdateOrganizationDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [removeOrganization, { loading: deleteLoading }] = useMutation(DeleteOrganizationDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [createMembership] = useMutation(CreateOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateMembership] = useMutation(UpdateOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteMembership] = useMutation(DeleteOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const saveOrganization = useCallback(
    async (formData: OrganizationFormData) => {
      if (!organization) {
        throw new Error('Organization not loaded');
      }

      await updateOrganization({
        variables: {
          input: {
            orgId: organization.orgId,
            name: formData.name,
            description: formData.description || null,
            logo: formData.logo || null,
            billingEmail: formData.billingEmail || null,
            tags: formData.tags ? normalizeTags(formData.tags) : [],
          },
        },
      });
    },
    [organization, updateOrganization],
  );

  const deleteOrganization = useCallback(async () => {
    if (!organization) {
      throw new Error('Organization not loaded');
    }

    await removeOrganization({
      variables: { orgId: organization.orgId },
    });

    router.push(ROUTES.ACCOUNT.ORGANIZATIONS.ROOT);
  }, [organization, removeOrganization, router]);

  const addOrganizationMembership = useCallback(
    async (user: User, role: OrganizationRole) => {
      if (!organization?.orgId) {
        throw new Error('Organization not loaded');
      }

      await createMembership({
        variables: {
          input: {
            orgId: organization.orgId,
            userId: user.userId,
            role,
          },
        },
      });
    },
    [organization, createMembership],
  );

  const updateOrganizationMembershipRole = useCallback(
    async (membershipId: string, role: OrganizationRole) => {
      await updateMembership({
        variables: {
          input: {
            membershipId,
            role,
          },
        },
      });
    },
    [updateMembership],
  );

  const deleteOrganizationMembership = useCallback(
    async (membershipId: string) => {
      await deleteMembership({
        variables: {
          input: { membershipId },
        },
      });
    },
    [deleteMembership],
  );

  const searchUsers = useCallback(
    async (searchTerm: string) => {
      const trimmed = searchTerm.trim();
      if (!trimmed) {
        return [];
      }

      const options: QueryOptionsInput = {
        pagination: { limit: 50 },
        search: {
          fields: ['username', 'email', 'given_name', 'family_name'],
          value: trimmed,
        },
      };

      const { data } = await searchUsersQuery({
        variables: {
          options,
        },
      });
      return data?.readUsers ?? [];
    },
    [searchUsersQuery],
  );

  return {
    organization,
    orgLoading,
    memberships,
    membershipsLoading,
    session,
    saveOrganization,
    deleteOrganization,
    addOrganizationMembership,
    updateOrganizationMembershipRole,
    deleteOrganizationMembership,
    refetchMemberships,
    searchUsers,
    searchLoading,
    updateLoading,
    deleteLoading,
  };
}
