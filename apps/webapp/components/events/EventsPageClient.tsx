'use client';

import { useMemo } from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useQuery } from '@apollo/client';
import { EventCategory, EventStatus, SortInput, SortOrderInput } from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import {
  GetAllEventCategoriesDocument,
  GetAllEventsDocument,
  GetPopularOrganizationsDocument,
} from '@/data/graphql/query';
import { DATE_FILTER_LABELS, DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import { getAuthHeader } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import EventTileSkeleton from '@/components/events/EventTileSkeleton';
import EventsSidebar, { PlatformStats } from '@/components/events/EventsSidebar';
import { PopularOrganization } from '@/components/events/PopularOrganizerBox';
import EventsHeader from '@/components/events/filters/EventsHeader';
import ActiveFiltersPills from '@/components/events/filters/ActiveFiltersPills';
import EventsList from '@/components/events/filters/EventsList';
import { CategoryMenu, DateMenu, LocationMenu, StatusMenu } from '@/components/events/filters/FilterMenus';
import { EventFilterProvider } from '@/components/events/filters/EventFilterContext';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useFilteredEvents } from '@/hooks/useFilteredEvents';

const DEFAULT_EVENTS_SORT: SortInput[] = [{ field: 'rsvpCount', order: SortOrderInput.Desc }];

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
    variables: {
      options: {
        sort: DEFAULT_EVENTS_SORT,
      },
    },
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

  const eventsList = (eventsData?.readEvents ?? []) as EventPreview[];
  const categories = (categoriesData?.readEventCategories ?? []) as EventCategory[];
  const orgs = organizationsData?.readOrganizations ?? [];

  const popularOrganization: PopularOrganization | null = useMemo(() => {
    if (orgs.length === 0) {
      return null;
    }
    return orgs.reduce<PopularOrganization>((prev, current) => {
      const prevFollowers = prev.followersCount ?? 0;
      const currentFollowers = current.followersCount ?? 0;
      return prevFollowers > currentFollowers ? prev : current;
    }, orgs[0]);
  }, [orgs]);

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
        <EventFilterProvider>
          <EventsContent
            categories={categories}
            initialEvents={eventsList}
            popularOrganization={popularOrganization}
            stats={stats}
          />
        </EventFilterProvider>
      )}
    </>
  );
}

interface EventsContentProps {
  categories: EventCategory[];
  initialEvents: EventPreview[];
  popularOrganization: PopularOrganization | null;
  stats: PlatformStats;
}

function EventsContent({ categories, initialEvents, popularOrganization, stats }: EventsContentProps) {
  const {
    filters,
    setSearchQuery,
    resetFilters,
    hasActiveFilters,
    removeCategory,
    removeStatus,
    setCategories,
    setStatuses,
    setDateRange,
    setLocation,
    clearLocation,
  } = useEventFilters();

  const { events: serverEvents, loading, error } = useFilteredEvents(filters, initialEvents);

  const filteredEvents = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    if (!query) {
      return serverEvents;
    }
    return serverEvents.filter(
      (event) =>
        event.title?.toLowerCase().includes(query) ||
        event.summary?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query),
    );
  }, [serverEvents, filters.searchQuery]);

  const statuses = Object.values(EventStatus);
  const dateOptions = Object.values(DATE_FILTER_OPTIONS);

  function getDateRangeForOption(option: string) {
    const today = dayjs().startOf('day');
    switch (option) {
      case DATE_FILTER_OPTIONS.TODAY:
        return { start: today, end: today, filterOption: option };
      case DATE_FILTER_OPTIONS.TOMORROW:
        return { start: today.add(1, 'day'), end: today.add(1, 'day'), filterOption: option };
      case DATE_FILTER_OPTIONS.THIS_WEEK:
        return { start: today.startOf('week'), end: today.endOf('week'), filterOption: option };
      case DATE_FILTER_OPTIONS.THIS_WEEKEND:
        const saturday = today.day(6);
        const sunday = today.day(0).add(1, 'week');
        return { start: saturday, end: sunday, filterOption: option };
      case DATE_FILTER_OPTIONS.THIS_MONTH:
        return { start: today.startOf('month'), end: today.endOf('month'), filterOption: option };
      default:
        return { start: null, end: null, filterOption: option };
    }
  }

  const eventTitles = filteredEvents.map((item) => item.title).filter((title): title is string => !!title);

  return (
    <Box component="main" sx={{ minHeight: '100vh', py: 4 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <EventsHeader eventCount={filteredEvents.length} eventTitles={eventTitles} onSearch={setSearchQuery} />

          {hasActiveFilters && (
            <Box sx={{ mb: 2 }}>
              <Button
                onClick={resetFilters}
                sx={(theme) => ({
                  background: theme.palette.action.selected,
                  color: theme.palette.text.primary,
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  '&:hover': {
                    background: theme.palette.action.hover,
                  },
                })}
              >
                Clear filters
              </Button>
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              overflowX: 'auto',
              pb: 1,
              mb: 2,
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '@media (min-width: 900px)': {
                overflowX: 'visible',
                flexWrap: 'wrap',
                gap: 2,
              },
            }}
          >
            <CategoryMenu
              categories={categories}
              selectedCategories={filters.categories}
              onToggle={(category) => {
                if (filters.categories.includes(category)) {
                  setCategories(filters.categories.filter((c) => c !== category));
                } else {
                  setCategories([...filters.categories, category]);
                }
              }}
            />
            <StatusMenu
              statuses={statuses}
              selectedStatuses={filters.statuses}
              onToggle={(status) => {
                if (filters.statuses.includes(status)) {
                  setStatuses(filters.statuses.filter((s) => s !== status));
                } else {
                  setStatuses([...filters.statuses, status]);
                }
              }}
            />
            <DateMenu
              dateOptions={dateOptions}
              selectedOption={filters.dateRange?.filterOption || null}
              onChange={(option) => {
                if (option === DATE_FILTER_OPTIONS.CUSTOM) {
                  setDateRange(null, null, option);
                } else {
                  const { start, end, filterOption } = getDateRangeForOption(option);
                  setDateRange(start, end, filterOption);
                }
              }}
              onCustomDateChange={(date) => {
                if (date) {
                  setDateRange(date, date, DATE_FILTER_OPTIONS.CUSTOM);
                } else {
                  setDateRange(null, null, DATE_FILTER_OPTIONS.CUSTOM);
                }
              }}
            />
            <LocationMenu currentLocation={filters.location} onApply={setLocation} onClear={clearLocation} />
          </Box>

          {hasActiveFilters && (
            <ActiveFiltersPills
              categories={filters.categories}
              statuses={filters.statuses}
              dateLabel={
                filters.dateRange?.filterOption === DATE_FILTER_OPTIONS.CUSTOM &&
                filters.dateRange.start &&
                filters.dateRange.end &&
                filters.dateRange.start.isSame(filters.dateRange.end, 'day')
                  ? filters.dateRange.start.format('MMM D, YYYY')
                  : filters.dateRange && filters.dateRange.filterOption
                    ? DATE_FILTER_LABELS[filters.dateRange.filterOption as keyof typeof DATE_FILTER_LABELS] ||
                      filters.dateRange.filterOption
                    : filters.dateRange && filters.dateRange.start && filters.dateRange.end
                      ? `${filters.dateRange.start.format('MMM D')} - ${filters.dateRange.end.format('MMM D')}`
                      : null
              }
              locationLabel={
                filters.location && (filters.location.city || filters.location.state || filters.location.country)
                  ? [filters.location.city, filters.location.state, filters.location.country].filter(Boolean).join(', ')
                  : filters.location && filters.location.latitude && filters.location.longitude
                    ? 'Near me'
                    : null
              }
              onRemoveCategory={removeCategory}
              onRemoveStatus={removeStatus}
              onRemoveDate={() => setDateRange(null, null)}
              onRemoveLocation={clearLocation}
            />
          )}

          <EventsList
            events={filteredEvents}
            loading={loading}
            error={error}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={resetFilters}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Box
            sx={{
              position: 'sticky',
              top: 80,
              maxHeight: 'calc(100vh - 96px)',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            <EventsSidebar
              popularOrganization={popularOrganization}
              stats={stats}
              trendingCategories={categories.slice(0, 6)}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
