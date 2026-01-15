'use client';

import { useMutation, useQuery } from '@apollo/client';
import { BlockUserDocument, UnblockUserDocument, GetBlockedUsersDocument } from '@/data/graphql/query';
import { useSession } from 'next-auth/react';

export function useBlock() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [blockUserMutation, { loading: blockLoading }] = useMutation(BlockUserDocument, {
    refetchQueries: ['GetBlockedUsers', 'GetFollowing', 'GetFollowers'],
    awaitRefetchQueries: true,
    context: {
      headers: {
        ...(token ? { token } : {}),
      },
    },
  });

  const [unblockUserMutation, { loading: unblockLoading }] = useMutation(UnblockUserDocument, {
    refetchQueries: ['GetBlockedUsers'],
    awaitRefetchQueries: true,
    context: {
      headers: {
        ...(token ? { token } : {}),
      },
    },
  });

  const blockUser = async (blockedUserId: string) => {
    return blockUserMutation({
      variables: {
        blockedUserId,
      },
    });
  };

  const unblockUser = async (blockedUserId: string) => {
    return unblockUserMutation({
      variables: {
        blockedUserId,
      },
    });
  };

  return {
    blockUser,
    unblockUser,
    blockLoading,
    unblockLoading,
    isLoading: blockLoading || unblockLoading,
  };
}

export function useBlockedUsers() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading, error, refetch } = useQuery(GetBlockedUsersDocument, {
    skip: !token,
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    context: {
      headers: {
        ...(token ? { token } : {}),
      },
    },
  });

  return {
    blockedUsers: data?.readBlockedUsers ?? [],
    loading,
    error,
    refetch,
  };
}
