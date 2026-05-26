'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetUserEventOccurrencesDocument } from '@/data/graphql/query/EventOccurrenceParticipant/query';
import type { GetUserEventOccurrencesQuery } from '@/data/graphql/types/graphql';
import {
  buildCollectionPagination,
  splitItemsByEventTime,
  type CollectionQueryPaginationOptions,
} from '@/lib/utils/eventCollections';
import { getAuthHeader } from '@/lib/utils/auth';

type UserOccurrencePreview = NonNullable<GetUserEventOccurrencesQuery['readUserEventOccurrences']>[number];

export function useUserEventOccurrences(
  userId: string | undefined,
  token?: string | null,
  options: CollectionQueryPaginationOptions = {},
) {
  const { enabled = true, limit, skip } = options;
  const { data, error, loading, refetch } = useQuery(GetUserEventOccurrencesDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !enabled || !userId,
    variables: {
      userId: userId ?? '',
      options: buildCollectionPagination(limit, skip),
    },
    context: { headers: getAuthHeader(token) },
  });

  const occurrences = useMemo(() => (data?.readUserEventOccurrences ?? []) as UserOccurrencePreview[], [data]);

  const { past, upcoming } = useMemo(
    () =>
      splitItemsByEventTime(
        occurrences,
        (occurrence) => occurrence.startAt,
        (occurrence) => occurrence.endAt,
      ),
    [occurrences],
  );

  return {
    error,
    loading,
    occurrences,
    pastEvents: past,
    refetch,
    upcomingEvents: upcoming,
  };
}
