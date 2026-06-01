'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, Box, Button, Grid, Stack, Typography } from '@mui/material';
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
import { useOccurrenceCalendarEvents } from '@/hooks/useOccurrenceCalendarEvents';
import { useSavedLocation } from '@/hooks/useSavedLocation';
import EventSearchBar from '@/components/search/EventSearchBar';
import { getEventPreviewEventId, getEventPreviewTitle } from '@/components/events/event-preview-utils';
import { buildDefaultOccurrenceDateRange } from '@/lib/utils/occurrence-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ToolbarEventSearchAction from '@/components/navigation/ToolbarEventSearchAction';
import { useToolbarAction } from '@/hooks/useToolbarAction';
import EventsViewTabs from '@/components/events/calendar/EventsViewTabs';
import EventsCalendarNavigator from '@/components/events/calendar/EventsCalendarNavigator';
import EventsWeekView from '@/components/events/calendar/EventsWeekView';
import EventsMonthView from '@/components/events/calendar/EventsMonthView';
import {
  buildOccurrenceCalendarRange,
  coerceEventsCalendarViewMode,
  resolveEventsCalendarAnchorDate,
  shiftOccurrenceCalendarAnchor,
} from '@/components/events/calendar/calendar-utils';

const DEFAULT_EVENTS_SORT: SortInput[] = [{ field: 'startAt', order: SortOrderInput.Asc }];
const DEFAULT_PAGE_SIZE = 10;

export default function EventsPageClient() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;
  const authContext = { headers: getAuthHeader(token) };
  const viewMode = coerceEventsCalendarViewMode(searchParams.get('view'));
  const shouldLoadListView = viewMode === 'list';

  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
  } = useQuery(GetEventOccurrencesDocument, {
    skip: !shouldLoadListView,
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
    skip: !shouldLoadListView,
    fetchPolicy: 'cache-and-network',
  });
  const eventsList = shouldLoadListView ? ((eventsData?.readEventOccurrences ?? []) as EventOccurrencePreview[]) : [];
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

  const totalEventsCount = shouldLoadListView ? (eventsData?.readEventOccurrencesCount ?? eventsList.length) : 0;

  const stats = useMemo(
    () => ({
      totalEvents: totalEventsCount,
      activeOrganizations: orgs.length,
    }),
    [totalEventsCount, orgs.length],
  );

  const isLoading =
    (shouldLoadListView ? eventsLoading : false) ||
    categoriesLoading ||
    (shouldLoadListView ? organizationsLoading : false);
  const hasError =
    (shouldLoadListView ? eventsError : null) || categoriesError || (shouldLoadListView ? organizationsError : null);

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
  const viewMode = coerceEventsCalendarViewMode(searchParams.get('view'));
  const isListView = viewMode === 'list';
  const calendarViewMode = isListView ? null : viewMode;
  const calendarAnchor = resolveEventsCalendarAnchorDate(searchParams.get('date'));
  const selectedEventId = searchParams.get('eventId')?.trim() ?? '';
  const hasSeriesSelection = selectedEventId.length > 0;
  const seriesSelectionKey = hasSeriesSelection ? selectedEventId : '';
  const appliedSeriesSelectionRef = useRef<string | null>(null);
  const {
    filters,
    resetFilters,
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

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutate(nextParams);
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleChangeViewMode = useCallback(
    (nextViewMode: 'list' | 'week' | 'month') => {
      replaceSearchParams((params) => {
        if (nextViewMode === 'list') {
          params.delete('view');
          params.delete('date');
          return;
        }

        params.set('view', nextViewMode);
        params.set('date', calendarAnchor.format('YYYY-MM-DD'));
      });
    },
    [calendarAnchor, replaceSearchParams],
  );

  const handleShiftCalendar = useCallback(
    (direction: -1 | 1) => {
      if (!calendarViewMode) {
        return;
      }

      const nextAnchor = shiftOccurrenceCalendarAnchor(calendarViewMode, calendarAnchor, direction);
      replaceSearchParams((params) => {
        params.set('view', calendarViewMode);
        params.set('date', nextAnchor.format('YYYY-MM-DD'));
      });
    },
    [calendarAnchor, calendarViewMode, replaceSearchParams],
  );

  const handleResetCalendarToToday = useCallback(() => {
    if (!calendarViewMode) {
      return;
    }

    const nextAnchor = dayjs().startOf('day');
    replaceSearchParams((params) => {
      params.set('view', calendarViewMode);
      params.set('date', nextAnchor.format('YYYY-MM-DD'));
    });
  }, [calendarViewMode, replaceSearchParams]);

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
  const calendarRange = useMemo(
    () => (calendarViewMode ? buildOccurrenceCalendarRange(calendarViewMode, calendarAnchor) : null),
    [calendarAnchor, calendarViewMode],
  );
  const {
    events: listEvents,
    loading: listLoading,
    error: listError,
    hasMore,
    loadMore,
    loadingMore,
    totalEvents: listTotalEvents,
  } = useFilteredEvents(
    filtersToUse,
    initialEvents,
    token,
    DEFAULT_EVENTS_SORT,
    initialTotalEvents,
    selectedEventId,
    isListView,
  );
  const {
    events: calendarEvents,
    loading: calendarLoading,
    error: calendarError,
    totalEvents: calendarTotalEvents,
  } = useOccurrenceCalendarEvents(
    filtersToUse,
    token,
    DEFAULT_EVENTS_SORT,
    calendarRange ?? buildDefaultOccurrenceDateRange(),
    selectedEventId,
    !isListView,
  );
  const serverEvents = isListView ? listEvents : calendarEvents;
  const loading = isListView ? listLoading : calendarLoading;
  const error = isListView ? listError : calendarError;
  const totalEvents = isListView ? listTotalEvents : calendarTotalEvents;

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
  const hasDateFilter = Boolean(filters.dateRange?.filterOption || filters.dateRange.start || filters.dateRange.end);
  const hasVisibleFilters =
    filters.categories.length > 0 || filters.statuses.length > 0 || hasLocation || (isListView && hasDateFilter);
  const hasVisibleActiveFilters = hasVisibleFilters || hasSeriesSelection;

  // Count active filters for bottom sheet badge
  const activeFilterCount =
    filters.categories.length +
    filters.statuses.length +
    (isListView && filters.dateRange?.filterOption ? 1 : 0) +
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
        <Grid size={{ xs: 12, lg: calendarViewMode ? 12 : 8 }}>
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

            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <EventSearchBar placeholder="Search events by title, location, or category..." size="medium" />
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <EventsViewTabs value={viewMode} onChange={handleChangeViewMode} />
          </Box>

          {calendarViewMode ? (
            <EventsCalendarNavigator
              anchorDate={calendarAnchor}
              viewMode={calendarViewMode}
              onPrevious={() => handleShiftCalendar(-1)}
              onNext={() => handleShiftCalendar(1)}
              onToday={handleResetCalendarToToday}
            />
          ) : null}

          {/* Mobile filter sheet trigger (xs/sm only) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, mb: 2, alignItems: 'center' }}>
            <EventFiltersBottomSheet
              categories={categories}
              statuses={statuses}
              dateOptions={dateOptions}
              showDateFilter={isListView}
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
            {hasVisibleActiveFilters && (
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

          {hasVisibleActiveFilters && (
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
            {isListView ? (
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
            ) : null}
            <LocationMenu currentLocation={filters.location} onApply={setLocation} onClear={clearLocation} />
          </Box>

          {hasVisibleFilters && (
            <ActiveFiltersPills
              categories={filters.categories}
              statuses={filters.statuses}
              dateLabel={
                isListView
                  ? filters.dateRange?.filterOption === DATE_FILTER_OPTIONS.CUSTOM &&
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

          {isListView ? (
            <EventsList
              events={filteredEvents}
              loading={loading}
              error={error}
              hasActiveFilters={hasVisibleActiveFilters}
              onClearFilters={clearAllFilters}
              hasMore={hasMore}
              onLoadMore={loadMore}
              loadingMore={loadingMore}
              totalCount={visibleEventCount}
            />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : loading && filteredEvents.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              Loading calendar…
            </Typography>
          ) : calendarViewMode === 'week' ? (
            <EventsWeekView anchorDate={calendarAnchor} occurrences={filteredEvents} />
          ) : (
            <EventsMonthView anchorDate={calendarAnchor} occurrences={filteredEvents} />
          )}
        </Grid>

        {isListView ? (
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
        ) : null}
      </Grid>
    </Box>
  );
}
