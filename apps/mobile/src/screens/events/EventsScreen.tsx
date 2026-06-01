import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { HeaderIconButton } from '@/app/navigation/HeaderIconButton';
import { MainTabScreenLayout } from '@/app/navigation/MainTabScreenLayout';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import type { MainTabParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { EventsFilterSheet } from '@/components/events/EventsFilterSheet';
import { EventsCalendarNavigator } from '@/components/events/calendar/EventsCalendarNavigator';
import { EventsMonthView } from '@/components/events/calendar/EventsMonthView';
import { EventsViewTabs } from '@/components/events/calendar/EventsViewTabs';
import { EventsWeekView } from '@/components/events/calendar/EventsWeekView';
import { FilterChip } from '@/components/core/FilterChip';
import { PageContainer } from '@/components/core/PageContainer';
import { StateNotice } from '@/components/core/StateNotice';
import { EventSearchBar } from '@/components/core/EventSearchBar';
import { EventCard } from '@/components/events/EventCard';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';
import { EventCardSkeleton } from '@/components/skeleton/EventCardSkeleton';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { useOccurrenceCalendarEvents } from '@/hooks/events/useOccurrenceCalendarEvents';
import { countActiveFilters, useEventsFilters } from '@/hooks/events/useEventsFilters';
import { useFilteredMobileEvents } from '@/hooks/events/useFilteredMobileEvents';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import type { MobileSearchResult } from '@/hooks/search/useEventSearch';
import {
  buildOccurrenceCalendarRange,
  shiftOccurrenceCalendarAnchor,
  type EventsCalendarViewMode,
} from '@/lib/events/occurrenceCalendar';

function applySeriesSelection(
  event: MobileSearchResult,
  setSearchQuery: (value: string) => void,
  setSelectedEventId: (value: string) => void,
) {
  setSearchQuery(event.title ?? '');
  setSelectedEventId(event.eventId);
}

export function EventsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, userId } = useAppShell();
  const { theme } = useAppTheme();
  const route = useRoute<RouteProp<MainTabParamList, 'Events'>>();
  const [searchQuery, setSearchQuery] = useState(route.params?.initialSearch ?? '');
  const [selectedEventId, setSelectedEventId] = useState(route.params?.initialEventId ?? '');
  const [searchVisible, setSearchVisible] = useState(false);
  const [viewMode, setViewMode] = useState<EventsCalendarViewMode>('list');
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const appliedSeriesSelectionRef = useRef<string | null>(null);
  const isListView = viewMode === 'list';
  const calendarViewMode = viewMode === 'list' ? null : viewMode;

  const {
    appliedFilters,
    draftFilters,
    sheetVisible,
    isHydrated,
    openSheet,
    closeSheet,
    applyFilters,
    clearAllFilters,
    toggleDraftCategory,
    toggleDraftStatus,
    setDraftDateOption,
    setDraftLocation,
    clearDraftLocation,
    removeAppliedDateOption,
    removeAppliedCategory,
    removeAppliedStatus,
    removeAppliedLocation,
  } = useEventsFilters(userId);

  const listQuery = useFilteredMobileEvents(appliedFilters, authToken, selectedEventId || undefined, isListView);
  const calendarRange = useMemo(
    () => buildOccurrenceCalendarRange(calendarViewMode ?? 'week', calendarAnchor),
    [calendarAnchor, calendarViewMode],
  );
  const calendarQuery = useOccurrenceCalendarEvents(
    appliedFilters,
    authToken,
    calendarRange,
    selectedEventId || undefined,
    !isListView,
  );
  const categories = isListView ? listQuery.categories : calendarQuery.categories;
  const error = isListView ? listQuery.error : calendarQuery.error;
  const events = isListView ? listQuery.events : calendarQuery.events;
  const hasMore = isListView ? listQuery.hasMore : false;
  const isFetchingMore = isListView ? listQuery.isFetchingMore : false;
  const loadMore = isListView ? listQuery.loadMore : async () => {};
  const loading = isListView ? listQuery.loading : calendarQuery.loading;
  const totalEvents = isListView ? listQuery.totalEvents : calendarQuery.totalEvents;
  const refetchActive = isListView ? listQuery.refetch : calendarQuery.refetch;
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetchActive();
    }, [refetchActive]),
  );

  // Client-side text search applied on top of server-side filtered results
  useEffect(() => {
    if (route.params?.initialSearch) {
      setSearchQuery(route.params.initialSearch);
    }

    if (route.params?.initialEventId) {
      setSelectedEventId(route.params.initialEventId);
    }
  }, [route.params?.initialEventId, route.params?.initialSearch]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!selectedEventId) {
      appliedSeriesSelectionRef.current = null;
      return;
    }

    const selectionKey = `${selectedEventId}:${searchQuery}`;
    if (appliedSeriesSelectionRef.current === selectionKey) {
      return;
    }

    clearAllFilters();
    appliedSeriesSelectionRef.current = selectionKey;
  }, [clearAllFilters, isHydrated, searchQuery, selectedEventId]);

  const filteredEvents = useMemo(() => {
    if (selectedEventId) {
      const exactMatches = events.filter((event) => event.eventSeries?.eventId === selectedEventId);

      if (exactMatches.length > 0) {
        return exactMatches;
      }
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return events;

    return events.filter((event) => {
      const haystack = [
        event.eventSeries?.title,
        event.eventSeries?.summary,
        event.eventSeries?.description,
        event.eventSeries?.organization?.name,
        event.eventSeries?.location?.address?.city,
        event.eventSeries?.location?.address?.state,
        ...(event.eventSeries?.eventCategories ?? []).map((cat) => cat.name ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [events, searchQuery, selectedEventId]);

  const visibleFilterCount = countActiveFilters(isListView ? appliedFilters : { ...appliedFilters, dateOption: null });
  const totalActiveFilterCount =
    visibleFilterCount + Number(Boolean(searchQuery.trim() && !selectedEventId)) + Number(Boolean(selectedEventId));

  const filtersKey = JSON.stringify(appliedFilters);
  const infiniteScroll = useInfiniteScroll({
    enabled: isListView && hasMore && (!Boolean(searchQuery.trim()) || Boolean(selectedEventId)),
    loading: (isListView ? loading : false) || isFetchingMore,
    onEndReached: () => void loadMore(),
    resetKey: `${filtersKey}:${searchQuery}:${selectedEventId}:${viewMode}`,
  });
  const visibleEventCount = selectedEventId ? totalEvents : searchQuery.trim() ? filteredEvents.length : totalEvents;

  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedEventId('');
    clearAllFilters();
  };
  const activeSearchLabel = searchQuery.trim();
  const calendarSummaryLabel =
    calendarViewMode === 'week'
      ? `${visibleEventCount} occurrence${visibleEventCount === 1 ? '' : 's'} in this week`
      : `${visibleEventCount} occurrence${visibleEventCount === 1 ? '' : 's'} in this month`;
  const eventsToolbarProps = {
    center: <Text style={[styles.toolbarTitle, { color: theme.colors.textPrimary }]}>Events</Text>,
    right: (
      <View style={styles.toolbarActions}>
        <HeaderIconButton accessibilityLabel="Search events" icon="search" onPress={() => setSearchVisible(true)} />
        <HeaderIconButton
          accessibilityLabel="Open filters"
          badgeCount={totalActiveFilterCount}
          icon="sliders"
          onPress={openSheet}
        />
      </View>
    ),
  };
  const handleShiftCalendar = (direction: -1 | 1) => {
    if (!calendarViewMode) {
      return;
    }

    setCalendarAnchor((current) => shiftOccurrenceCalendarAnchor(calendarViewMode, current, direction));
  };

  const handleResetCalendarToToday = () => {
    setCalendarAnchor(new Date());
  };

  const handlePressOccurrence = (occurrence: (typeof filteredEvents)[number]) => {
    navigation.navigate('EventDetails', { occurrence });
  };

  return (
    <MainTabScreenLayout
      overlay={
        <EventSearchBar
          onClose={() => setSearchVisible(false)}
          onSelectEvent={(event) => {
            clearAllFilters();
            applySeriesSelection(event, setSearchQuery, setSelectedEventId);
          }}
          visible={searchVisible}
        />
      }
      toolbarProps={eventsToolbarProps}
    >
      <PageContainer
        onContentSizeChange={isListView ? infiniteScroll.onContentSizeChange : undefined}
        onRefresh={onRefresh}
        onScroll={isListView ? infiniteScroll.onScroll : undefined}
        refreshing={refreshing}
        scrollEventThrottle={isListView ? infiniteScroll.scrollEventThrottle : undefined}
      >
        <EventsViewTabs onChange={setViewMode} value={viewMode} />

        {calendarViewMode ? (
          <EventsCalendarNavigator
            anchorDate={calendarAnchor}
            onNext={() => handleShiftCalendar(1)}
            onPrevious={() => handleShiftCalendar(-1)}
            onToday={handleResetCalendarToToday}
            viewMode={calendarViewMode}
          />
        ) : null}

        {totalActiveFilterCount > 0 ? (
          <View style={styles.clearActionRow}>
            <Pressable
              onPress={handleClearAll}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, justifyContent: 'center' }]}
            >
              <Text style={[styles.clearActionText, { color: theme.colors.textSecondary }]}>Clear all</Text>
            </Pressable>
          </View>
        ) : null}

        {visibleFilterCount > 0 ? (
          <View style={styles.activeFilterRow}>
            {isListView && appliedFilters.dateOption ? (
              <FilterChip
                active
                small
                label={
                  {
                    TODAY: 'Today',
                    TOMORROW: 'Tomorrow',
                    THIS_WEEK: 'This Week',
                    THIS_WEEKEND: 'This Weekend',
                    THIS_MONTH: 'This Month',
                  }[appliedFilters.dateOption] ?? appliedFilters.dateOption
                }
                onPress={openSheet}
                onRemove={removeAppliedDateOption}
              />
            ) : null}
            {appliedFilters.statuses.map((status) => (
              <FilterChip
                active
                small
                key={status}
                label={status}
                onPress={openSheet}
                onRemove={() => removeAppliedStatus(status)}
              />
            ))}
            {appliedFilters.categories.map((catName) => (
              <FilterChip
                active
                small
                key={catName}
                label={catName}
                onPress={openSheet}
                onRemove={() => removeAppliedCategory(catName)}
              />
            ))}
            {appliedFilters.location.city || appliedFilters.location.state || appliedFilters.location.country ? (
              <FilterChip
                active
                small
                label={[appliedFilters.location.city, appliedFilters.location.state, appliedFilters.location.country]
                  .filter(Boolean)
                  .join(', ')}
                onPress={openSheet}
                onRemove={removeAppliedLocation}
              />
            ) : null}
          </View>
        ) : null}

        {loading && events.length === 0 ? (
          <SkeletonBlock style={styles.eventsCountSkeleton} />
        ) : viewMode === 'month' ? null : (
          <Text style={[styles.eventsCount, { color: theme.colors.textPrimary }]}>
            {isListView ? `${visibleEventCount} Events Found` : calendarSummaryLabel}
          </Text>
        )}

        {loading && events.length === 0 ? (
          isListView ? (
            <View style={styles.feedList}>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </View>
          ) : (
            <View style={styles.calendarLoadingStack}>
              <SkeletonBlock style={styles.calendarSkeletonHeader} />
              <SkeletonBlock style={styles.calendarSkeletonSurface} />
              <SkeletonBlock style={styles.calendarSkeletonSurface} />
            </View>
          )
        ) : error ? (
          <StateNotice
            actionLabel="Retry"
            message={isListView ? 'The event feed failed to load.' : 'The calendar failed to load.'}
            onPressAction={() => void refetchActive()}
          />
        ) : filteredEvents.length > 0 ? (
          isListView ? (
            <View style={styles.feedList}>
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.occurrenceId}
                  occurrence={event}
                  onPress={() => navigation.navigate('EventDetails', { occurrence: event })}
                  variant="feed"
                />
              ))}
              {isFetchingMore ? <EventCardSkeleton /> : null}
            </View>
          ) : calendarViewMode === 'week' ? (
            <EventsWeekView
              anchorDate={calendarAnchor}
              occurrences={filteredEvents}
              onPressOccurrence={handlePressOccurrence}
            />
          ) : (
            <EventsMonthView
              anchorDate={calendarAnchor}
              occurrences={filteredEvents}
              onPressOccurrence={handlePressOccurrence}
            />
          )
        ) : (
          <StateNotice
            message={
              isListView
                ? 'No events match your current search or filter.'
                : 'No occurrences match your current search or filter in this calendar window.'
            }
          />
        )}

        <EventsFilterSheet
          activeSearchLabel={activeSearchLabel}
          categories={categories}
          draft={draftFilters}
          onApply={applyFilters}
          onClearAll={handleClearAll}
          onClearLocation={clearDraftLocation}
          onClearSearch={() => {
            setSearchQuery('');
            setSelectedEventId('');
          }}
          onClose={closeSheet}
          onSetDateOption={setDraftDateOption}
          onSetLocation={setDraftLocation}
          onToggleCategory={toggleDraftCategory}
          onToggleStatus={toggleDraftStatus}
          showDateFilter={isListView}
          visible={sheetVisible}
        />
      </PageContainer>
    </MainTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  activeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  calendarLoadingStack: {
    gap: 14,
  },
  calendarSkeletonHeader: {
    height: 52,
    width: '72%',
  },
  calendarSkeletonSurface: {
    borderRadius: 18,
    height: 240,
  },
  clearActionText: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  clearActionRow: {
    alignItems: 'flex-end',
  },
  eventsCount: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
    marginTop: 8,
  },
  eventsCountSkeleton: {
    height: 22,
    marginTop: 8,
    width: 152,
  },
  feedList: {
    gap: 24,
  },
  toolbarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  toolbarTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
    letterSpacing: -0.3,
  },
});
