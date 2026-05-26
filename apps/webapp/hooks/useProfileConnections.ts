'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GetFollowersDocument, GetUserFollowingDocument } from '@/data/graphql/query/Follow/query';
import type { GetFollowersQuery, GetUserFollowingQuery, QueryOptionsInput } from '@/data/graphql/types/graphql';
import { FollowTargetType, SortOrderInput } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { logger } from '@/lib/utils';

const PAGE_SIZE = 24;

type WebFollower = NonNullable<GetFollowersQuery['readFollowers']>[number];
type WebFollowing = NonNullable<GetUserFollowingQuery['readUserFollowing']>[number];

type UsePaginatedConnectionsOptions = {
  enabled?: boolean;
  pageSize?: number;
  totalCount?: number | null;
};

function buildConnectionQueryOptions(pageSize: number, skip = 0): QueryOptionsInput {
  return {
    pagination: {
      limit: pageSize,
      skip,
    },
    sort: [
      {
        field: 'createdAt',
        order: SortOrderInput.Desc,
      },
    ],
  };
}

function resolveHasMore(
  totalCount: number | null | undefined,
  loadedCount: number,
  pageLength: number,
  pageSize: number,
) {
  if (typeof totalCount === 'number' && totalCount >= 0) {
    return loadedCount < totalCount;
  }

  return pageLength >= pageSize;
}

export function usePaginatedFollowers(
  userId: string | undefined,
  token?: string | null,
  options: UsePaginatedConnectionsOptions = {},
) {
  const { enabled = true, pageSize = PAGE_SIZE, totalCount } = options;
  const [followers, setFollowers] = useState<WebFollower[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(0);
  const followersRef = useRef<WebFollower[]>([]);

  const [loadFollowers, { loading }] = useLazyQuery(GetFollowersDocument, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  const loadPage = useCallback(
    async (page: number) => {
      if (!userId) {
        return [];
      }

      const response = await loadFollowers({
        context: { headers: getAuthHeader(token) },
        variables: {
          options: buildConnectionQueryOptions(pageSize, page * pageSize),
          targetId: userId,
          targetType: FollowTargetType.User,
        },
      });

      return (response.data?.readFollowers ?? []) as WebFollower[];
    },
    [loadFollowers, pageSize, token, userId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setFollowers([]);
      setHasMore(false);
      setError(null);
      pageRef.current = 0;
      return;
    }

    try {
      setError(null);
      pageRef.current = 0;
      const page = await loadPage(0);
      followersRef.current = page;
      setFollowers(page);
      setHasMore(resolveHasMore(totalCount, page.length, page.length, pageSize));
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load followers right now.');
      logger.error('Failed to load paginated followers', resolvedError);
      setError(resolvedError);
      followersRef.current = [];
      setFollowers([]);
      setHasMore(false);
    }
  }, [enabled, loadPage, pageSize, totalCount, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMoreRef.current || !hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const page = await loadPage(nextPage);
      const existingIds = new Set(followersRef.current.map((follow) => follow.followId));
      const nextFollowers = [...followersRef.current, ...page.filter((follow) => !existingIds.has(follow.followId))];
      followersRef.current = nextFollowers;
      setFollowers(nextFollowers);
      setHasMore(resolveHasMore(totalCount, nextFollowers.length, page.length, pageSize));
      pageRef.current = nextPage;
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load more followers right now.');
      logger.error('Failed to load more paginated followers', resolvedError);
      setError(resolvedError);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, pageSize, totalCount, userId]);

  return useMemo(
    () => ({
      error,
      followers,
      hasMore,
      loadMore,
      loading,
      loadingMore,
      refetch: refresh,
    }),
    [error, followers, hasMore, loadMore, loading, loadingMore, refresh],
  );
}

export function usePaginatedUserFollowing(
  userId: string | undefined,
  token?: string | null,
  options: UsePaginatedConnectionsOptions = {},
) {
  const { enabled = true, pageSize = PAGE_SIZE, totalCount } = options;
  const [following, setFollowing] = useState<WebFollowing[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(0);
  const followingRef = useRef<WebFollowing[]>([]);

  const [loadFollowing, { loading }] = useLazyQuery(GetUserFollowingDocument, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  const loadPage = useCallback(
    async (page: number) => {
      if (!userId) {
        return [];
      }

      const response = await loadFollowing({
        context: { headers: getAuthHeader(token) },
        variables: {
          options: buildConnectionQueryOptions(pageSize, page * pageSize),
          userId,
        },
      });

      return (response.data?.readUserFollowing ?? []) as WebFollowing[];
    },
    [loadFollowing, pageSize, token, userId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setFollowing([]);
      setHasMore(false);
      setError(null);
      pageRef.current = 0;
      return;
    }

    try {
      setError(null);
      pageRef.current = 0;
      const page = await loadPage(0);
      followingRef.current = page;
      setFollowing(page);
      setHasMore(resolveHasMore(totalCount, page.length, page.length, pageSize));
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load following right now.');
      logger.error('Failed to load paginated following', resolvedError);
      setError(resolvedError);
      followingRef.current = [];
      setFollowing([]);
      setHasMore(false);
    }
  }, [enabled, loadPage, pageSize, totalCount, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMoreRef.current || !hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const page = await loadPage(nextPage);
      const existingIds = new Set(followingRef.current.map((follow) => follow.followId));
      const nextFollowing = [...followingRef.current, ...page.filter((follow) => !existingIds.has(follow.followId))];
      followingRef.current = nextFollowing;
      setFollowing(nextFollowing);
      setHasMore(resolveHasMore(totalCount, nextFollowing.length, page.length, pageSize));
      pageRef.current = nextPage;
    } catch (caughtError) {
      const resolvedError =
        caughtError instanceof Error ? caughtError : new Error('Unable to load more following right now.');
      logger.error('Failed to load more paginated following', resolvedError);
      setError(resolvedError);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadPage, pageSize, totalCount, userId]);

  return useMemo(
    () => ({
      error,
      following,
      hasMore,
      loadMore,
      loading,
      loadingMore,
      refetch: refresh,
    }),
    [error, following, hasMore, loadMore, loading, loadingMore, refresh],
  );
}
