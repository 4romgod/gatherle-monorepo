'use client';

import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { useQuery } from '@apollo/client';
import {
  GetAllEventsDocument,
  GetAllEventCategoriesDocument,
  GetPopularOrganizationsDocument,
} from '@/data/graphql/query';
import { getAuthHeader } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import EventTileSkeleton from '@/components/events/EventTileSkeleton';
import EventsClientWrapper from '@/components/events/EventsClientWrapper';
import { PopularOrganization } from '@/components/events/PopularOrganizerBox';

export default function EventsPageClient() {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const authContext = { headers: getAuthHeader(token) };

  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
  } = useQuery(GetAllEventsDocument, {
    context: authContext,
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
  } = useQuery(GetAllEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: organizationsData,
    loading: organizationsLoading,
    error: organizationsError,
  } = useQuery(GetPopularOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const eventsList = eventsData?.readEvents ?? [];
  const categories = categoriesData?.readEventCategories ?? [];
  const orgs = organizationsData?.readOrganizations ?? [];

  const popularOrganization: PopularOrganization | null = useMemo(
    () =>
      orgs.length > 0
        ? (orgs as PopularOrganization[]).reduce(
            (prev: PopularOrganization, current: PopularOrganization) => {
              const prevFollowers = prev.followersCount ?? 0;
              const currentFollowers = current.followersCount ?? 0;
              return prevFollowers > currentFollowers ? prev : current;
            },
          )
        : null,
    [orgs],
  );

  const stats = useMemo(
    () => ({
      totalEvents: eventsList.length,
      activeOrganizations: orgs.length,
    }),
    [eventsList.length, orgs.length],
  );

  const isLoading = eventsLoading || categoriesLoading || organizationsLoading;
  const hasError = eventsError || categoriesError || organizationsError;

  if (hasError) {
    return (
      <Typography color="error" sx={{ mt: 4 }}>
        Unable to load events right now. Please try again shortly.
      </Typography>
    );
  }

  return (
    <>
      {isLoading && eventsList.length === 0 ? (
        <EventTileSkeleton count={4} />
      ) : (
        <EventsClientWrapper
          events={eventsList}
          categories={categories}
          popularOrganization={popularOrganization}
          stats={stats}
        />
      )}
    </>
  );
}
