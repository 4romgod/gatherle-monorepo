import { useMutation, useQuery } from '@apollo/client';
import {
  GetMutedOrganizationIdsDocument,
  GetMutedUsersDocument,
  MuteOrganizationDocument,
  MuteUserDocument,
  UnmuteOrganizationDocument,
  UnmuteUserDocument,
} from '@/data/graphql/query';
import { getFollowAuthContext, useFollowAuthToken } from './auth';

/**
 * Hook to mute/unmute users.
 * Muted users' content will be hidden from your feed.
 */
export function useMuteUser() {
  const token = useFollowAuthToken();

  const [muteMutation, { loading: muteLoading }] = useMutation(MuteUserDocument, {
    refetchQueries: ['GetMutedUsers'],
    ...getFollowAuthContext(token),
  });

  const [unmuteMutation, { loading: unmuteLoading }] = useMutation(UnmuteUserDocument, {
    refetchQueries: ['GetMutedUsers'],
    ...getFollowAuthContext(token),
  });

  const muteUser = async (userId: string) => {
    return muteMutation({
      variables: { mutedUserId: userId },
    });
  };

  const unmuteUser = async (userId: string) => {
    return unmuteMutation({
      variables: { mutedUserId: userId },
    });
  };

  return {
    muteUser,
    unmuteUser,
    loading: muteLoading || unmuteLoading,
  };
}

/**
 * Hook to get the list of muted users.
 */
export function useMutedUsers() {
  const token = useFollowAuthToken();

  const { data, loading, error, refetch } = useQuery(GetMutedUsersDocument, {
    skip: !token,
    ...getFollowAuthContext(token),
  });

  return {
    mutedUsers: data?.readMutedUsers ?? [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to mute/unmute organizations.
 * Muted organizations' content will be hidden from your feed.
 */
export function useMuteOrganization() {
  const token = useFollowAuthToken();

  const [muteMutation, { loading: muteLoading }] = useMutation(MuteOrganizationDocument, {
    refetchQueries: ['GetMutedOrganizationIds'],
    ...getFollowAuthContext(token),
  });

  const [unmuteMutation, { loading: unmuteLoading }] = useMutation(UnmuteOrganizationDocument, {
    refetchQueries: ['GetMutedOrganizationIds'],
    ...getFollowAuthContext(token),
  });

  const muteOrganization = async (organizationId: string) => {
    return muteMutation({
      variables: { organizationId },
    });
  };

  const unmuteOrganization = async (organizationId: string) => {
    return unmuteMutation({
      variables: { organizationId },
    });
  };

  return {
    muteOrganization,
    unmuteOrganization,
    loading: muteLoading || unmuteLoading,
  };
}

/**
 * Hook to get the list of muted organization IDs.
 */
export function useMutedOrganizations() {
  const token = useFollowAuthToken();

  const { data, loading, error, refetch } = useQuery(GetMutedOrganizationIdsDocument, {
    skip: !token,
    ...getFollowAuthContext(token),
  });

  return {
    mutedOrgIds: data?.readMutedOrganizationIds ?? [],
    loading,
    error,
    refetch,
  };
}
