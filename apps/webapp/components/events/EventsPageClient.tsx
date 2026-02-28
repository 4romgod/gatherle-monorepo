'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useQuery } from '@apollo/client';
import { EventCategory, EventStatus, Organization, SortInput, SortOrderInput } from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import {
  GetAllEventCategoriesDocument,
  GetAllEventsDocument,
  GetEventsCountDocument,
  GetPopularOrganizationsDocument,
} from '@/data/graphql/query';
import { DATE_FILTER_LABELS, DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import { getAuthHeader } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import EventsPageSkeleton from '@/components/events/EventsPageSkeleton';
import EventsSidebar, { PlatformStats } from '@/components/events/EventsSidebar';
import ActiveFiltersPills from '@/components/events/filters/ActiveFiltersPills';
import EventsList from '@/components/events/filters/EventsList';
import { CategoryMenu, DateMenu, LocationMenu, StatusMenu } from '@/components/events/filters/FilterMenus';
import EventFiltersBottomSheet from '@/components/events/filters/EventFiltersBottomSheet';
import { EventFilterProvider, initialFilters } from '@/components/events/filters/EventFilterContext';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useFilteredEvents } from '@/hooks/useFilteredEvents';
import { useSavedLocation } from '@/hooks/useSavedLocation';
import EventSearchBar from '@/components/search/EventSearchBar';

const DEFAULT_EVENTS_SORT: SortInput[] = [
  { field: 'rsvpCount', order: SortOrderInput.Desc },
  { field: '_id', order: SortOrderInput.Asc },
];
const DEFAULT_PAGE_SIZE = 10;

export default function EventsPageClient() {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;
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
        pagination: { limit: DEFAULT_PAGE_SIZE, skip: 0 },
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
  const { data: totalEventsData } = useQuery(GetEventsCountDocument, {
    context: authContext,
    fetchPolicy: 'cache-and-network',
  });

  const eventsList = (eventsData?.readEvents ?? []) as EventPreview[];
  const categories = (categoriesData?.readEventCategories ?? []) as EventCategory[];
  const orgs = organizationsData?.readOrganizations ?? [];

  const popularOrganization: Organization | null = useMemo(() => {
    if (orgs.length === 0) {
      return null;
    }
    return orgs.reduce<Organization>((prev, current) => {
      const prevFollowers = prev.followersCount ?? 0;
      const currentFollowers = current.followersCount ?? 0;
      return prevFollowers > currentFollowers ? prev : current;
    }, orgs[0]);
  }, [orgs]);

  const totalEventsCount = totalEventsData?.readEventsCount ?? eventsList.length;

  const stats = useMemo(
    () => ({
      totalEvents: totalEventsCount,
      activeOrganizations: orgs.length,
    }),
    [totalEventsCount, orgs.length],
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
        <EventsPageSkeleton />
      ) : (
        <EventFilterProvider userId={userId} token={token}>
          <EventsContent
            categories={categories}
            initialEvents={eventsList}
            popularOrganization={popularOrganization}
            stats={stats}
            userId={userId}
            totalEventsCount={totalEventsCount}
          />
        </EventFilterProvider>
      )}
    </>
  );
}

interface EventsContentProps {
  categories: EventCategory[];
  initialEvents: EventPreview[];
  popularOrganization: Organization | null;
  stats: PlatformStats;
  userId?: string;
  totalEventsCount: number;
}

function EventsContent({
  categories,
  initialEvents,
  popularOrganization,
  stats,
  userId,
  totalEventsCount,
}: EventsContentProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;
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
    clearLocation: clearFilterLocation,
    isHydrated,
  } = useEventFilters();
  const {
    location: savedLocation,
    clearLocation: clearSavedLocation,
    isHydrated: isLocationHydrated,
  } = useSavedLocation(userId);

  // Combined clear function that clears both filter state and saved location
  const clearLocation = useCallback(() => {
    clearFilterLocation();
    clearSavedLocation();
  }, [clearFilterLocation, clearSavedLocation]);

  const clearAllFilters = useCallback(() => {
    resetFilters();
    clearSavedLocation();
  }, [resetFilters, clearSavedLocation]);

  // Wait for filters to hydrate before applying them to prevent double-fetch on page load
  const filtersToUse = isHydrated ? filters : initialFilters;
  const {
    events: serverEvents,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
  } = useFilteredEvents(filtersToUse, initialEvents, token, DEFAULT_EVENTS_SORT);

  const hasCoordinates =
    typeof filters.location?.latitude === 'number' && typeof filters.location?.longitude === 'number';
  const hasLocation = !!(
    filters.location?.city ||
    filters.location?.state ||
    filters.location?.country ||
    hasCoordinates
  );

  useEffect(() => {
    if (isHydrated && isLocationHydrated && !hasLocation && savedLocation.latitude && savedLocation.longitude) {
      setLocation({
        latitude: savedLocation.latitude,
        longitude: savedLocation.longitude,
        radiusKm: savedLocation.radiusKm ?? 50,
      });
    }
  }, [
    isHydrated,
    isLocationHydrated,
    hasLocation,
    savedLocation.latitude,
    savedLocation.longitude,
    savedLocation.radiusKm,
    setLocation,
  ]);

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

  // Count active filters for bottom sheet badge
  const activeFilterCount =
    filters.categories.length +
    filters.statuses.length +
    (filters.dateRange?.filterOption ? 1 : 0) +
    (hasLocation ? 1 : 0);

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

  return (
    <Box component="main" sx={{ minHeight: '100vh', py: 4 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box mb={4}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
              <Box>
                <Typography
                  variant="h3"
                  fontWeight={700}
                  className="glow-text"
                  sx={{ mb: 1, fontSize: { xs: '1.75rem', md: '2.5rem' } }}
                >
                  Discover Events
                </Typography>
              </Box>
            </Stack>

            <EventSearchBar placeholder="Search events by title, location, or category..." size="medium" />
          </Box>

          {/* Mobile filter sheet trigger (xs/sm only) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, mb: 2, alignItems: 'center' }}>
            <EventFiltersBottomSheet
              categories={categories}
              statuses={statuses}
              dateOptions={dateOptions}
              selectedCategories={filters.categories}
              selectedStatuses={filters.statuses}
              selectedDateOption={filters.dateRange?.filterOption || null}
              selectedLocation={filters.location}
              onToggleCategory={(category) => {
                if (filters.categories.includes(category)) {
                  setCategories(filters.categories.filter((c) => c !== category));
                } else {
                  setCategories([...filters.categories, category]);
                }
              }}
              onToggleStatus={(status) => {
                if (filters.statuses.includes(status)) {
                  setStatuses(filters.statuses.filter((s) => s !== status));
                } else {
                  setStatuses([...filters.statuses, status]);
                }
              }}
              onChangeDateOption={(option) => {
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
              onApplyLocation={setLocation}
              onClearLocation={clearLocation}
              onClearAll={clearAllFilters}
              activeFilterCount={activeFilterCount}
            />
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={clearAllFilters}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  color: 'text.secondary',
                }}
              >
                Clear all
              </Button>
            )}
          </Box>

          {hasActiveFilters && (
            <Box sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
              <Button
                onClick={clearAllFilters}
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

          {/* Desktop filter pills (md+) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 2,
              pb: 1,
              mb: 2,
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
            onClearFilters={clearAllFilters}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
            totalCount={hasActiveFilters ? undefined : totalEventsCount}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box
            sx={{
              position: { lg: 'sticky' },
              top: { lg: 80 },
              maxHeight: { lg: 'calc(100vh - 96px)' },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              paddingBottom: 2,
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              overflowY: { lg: 'auto' },
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
