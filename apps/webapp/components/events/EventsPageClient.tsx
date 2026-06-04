'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useQuery } from '@apollo/client';
import { EventCategory, EventStatus, Organization, SortInput, SortOrderInput } from '@/data/graphql/types/graphql';
import { EventOccurrencePreview } from '@/data/graphql/query/Event/types';
import { GetEventCategoriesDocument, GetPopularOrganizationsDocument } from '@/data/graphql/query';
import { GetEventOccurrencesDocument } from '@/data/graphql/query';
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
import { getEventPreviewEventId, getEventPreviewTitle } from '@/components/events/event-preview-utils';
import { buildDefaultOccurrenceDateRange } from '@/lib/utils/occurrence-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ToolbarEventSearchAction from '@/components/navigation/ToolbarEventSearchAction';
import { useToolbarAction } from '@/hooks/useToolbarAction';

const DEFAULT_EVENTS_SORT: SortInput[] = [{ field: 'startAt', order: SortOrderInput.Asc }];
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
  } = useQuery(GetEventOccurrencesDocument, {
    context: authContext,
    fetchPolicy: 'cache-and-network',
    variables: {
      options: {
        dateRange: buildDefaultOccurrenceDateRange(),
        sort: DEFAULT_EVENTS_SORT,
        pagination: { limit: DEFAULT_PAGE_SIZE, skip: 0 },
      },
    },
  });

  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
  } = useQuery(GetEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: organizationsData,
    loading: organizationsLoading,
    error: organizationsError,
  } = useQuery(GetPopularOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
  });
  const eventsList = (eventsData?.readEventOccurrences ?? []) as EventOccurrencePreview[];
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

  const totalEventsCount = eventsData?.readEventOccurrencesCount ?? eventsList.length;

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
            initialTotalEvents={totalEventsCount}
            popularOrganization={popularOrganization}
            stats={stats}
            userId={userId}
          />
        </EventFilterProvider>
      )}
    </>
  );
}

interface EventsContentProps {
  categories: EventCategory[];
  initialEvents: EventOccurrencePreview[];
  initialTotalEvents: number;
  popularOrganization: Organization | null;
  stats: PlatformStats;
  userId?: string;
}

function EventsContent({
  categories,
  initialEvents,
  initialTotalEvents,
  popularOrganization,
  stats,
  userId,
}: EventsContentProps) {
  const toolbarAction = useMemo(
    () => <ToolbarEventSearchAction placeholder="Search events by title, location, or category..." />,
    [],
  );
  useToolbarAction(toolbarAction);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = session?.user?.token;
  const selectedEventId = searchParams.get('eventId')?.trim() ?? '';
  const hasSeriesSelection = selectedEventId.length > 0;
  const seriesSelectionKey = hasSeriesSelection ? selectedEventId : '';
  const appliedSeriesSelectionRef = useRef<string | null>(null);
  const {
    filters,
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

  const clearSeriesSelection = useCallback(() => {
    if (!hasSeriesSelection) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('eventId');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [hasSeriesSelection, pathname, router, searchParams]);

  const clearAllFilters = useCallback(() => {
    resetFilters();
    clearSavedLocation();
    if (hasSeriesSelection) {
      clearSeriesSelection();
      return;
    }
  }, [clearSavedLocation, clearSeriesSelection, hasSeriesSelection, resetFilters]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!hasSeriesSelection) {
      appliedSeriesSelectionRef.current = null;
      return;
    }

    if (appliedSeriesSelectionRef.current === seriesSelectionKey) {
      return;
    }

    resetFilters();
    appliedSeriesSelectionRef.current = seriesSelectionKey;
  }, [hasSeriesSelection, isHydrated, resetFilters, seriesSelectionKey]);

  // Wait for filters to hydrate before applying them to prevent double-fetch on page load
  const filtersToUse =
    !isHydrated || (hasSeriesSelection && appliedSeriesSelectionRef.current !== seriesSelectionKey)
      ? initialFilters
      : filters;
  const {
    events: serverEvents,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    totalEvents,
  } = useFilteredEvents(filtersToUse, initialEvents, token, DEFAULT_EVENTS_SORT, initialTotalEvents, selectedEventId);

  const hasCoordinates =
    typeof filters.location?.latitude === 'number' && typeof filters.location?.longitude === 'number';
  const hasLocation = !!(
    filters.location?.city ||
    filters.location?.state ||
    filters.location?.country ||
    hasCoordinates
  );

  useEffect(() => {
    if (
      isHydrated &&
      isLocationHydrated &&
      !hasSeriesSelection &&
      !hasLocation &&
      savedLocation.latitude &&
      savedLocation.longitude
    ) {
      setLocation({
        latitude: savedLocation.latitude,
        longitude: savedLocation.longitude,
        radiusKm: savedLocation.radiusKm ?? 50,
      });
    }
  }, [
    isHydrated,
    isLocationHydrated,
    hasSeriesSelection,
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
        event.eventSeries?.title?.toLowerCase().includes(query) ||
        event.eventSeries?.summary?.toLowerCase().includes(query) ||
        event.eventSeries?.description?.toLowerCase().includes(query) ||
        event.eventSeries?.location?.address?.city?.toLowerCase().includes(query) ||
        event.eventSeries?.location?.address?.state?.toLowerCase().includes(query) ||
        event.eventSeries?.eventCategories?.some((category) => category.name?.toLowerCase().includes(query)),
    );
  }, [serverEvents, filters.searchQuery]);
  const visibleEventCount = filters.searchQuery.trim() ? filteredEvents.length : totalEvents;
  const activeSearchLabel = useMemo(() => {
    if (!hasSeriesSelection) {
      return '';
    }

    const selectedEvent = serverEvents.find((event) => getEventPreviewEventId(event) === selectedEventId);
    return selectedEvent ? getEventPreviewTitle(selectedEvent).trim() : 'Selected event';
  }, [hasSeriesSelection, selectedEventId, serverEvents]);

  const statuses = Object.values(EventStatus);
  const dateOptions = Object.values(DATE_FILTER_OPTIONS);

  // Count active filters for bottom sheet badge
  const activeFilterCount =
    filters.categories.length +
    filters.statuses.length +
    (filters.dateRange?.filterOption ? 1 : 0) +
    (hasLocation ? 1 : 0) +
    (hasSeriesSelection ? 1 : 0);

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
          <Box
            sx={{
              mb: 3,
              p: { xs: 2.25, md: 3 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.08em' }}>
              Explore is wide open
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              Search, filter, and browse the full event map.
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Unlike Home, this page is built for broad discovery. Use it when you want categories, timing, location,
              and search to shape the night instead of relying on your feed alone.
            </Typography>
          </Box>

          <Box mb={4}>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <EventSearchBar placeholder="Search events by title, location, or category..." size="medium" />
            </Box>
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
              activeSearchLabel={activeSearchLabel}
              onClearSearch={clearSeriesSelection}
              activeFilterCount={activeFilterCount}
            />
            {(hasActiveFilters || hasSeriesSelection) && (
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

          {(hasActiveFilters || hasSeriesSelection) && (
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
                  fontSize: '0.8125rem',
                  minHeight: 36,
                  px: 1.75,
                  py: 0.7,
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
            hasActiveFilters={hasActiveFilters || hasSeriesSelection}
            onClearFilters={clearAllFilters}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
            totalCount={visibleEventCount}
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
