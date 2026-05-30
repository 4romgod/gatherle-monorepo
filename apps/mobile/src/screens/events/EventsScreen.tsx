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
import { FilterChip } from '@/components/core/FilterChip';
import { PageContainer } from '@/components/core/PageContainer';
import { StateNotice } from '@/components/core/StateNotice';
import { EventSearchBar } from '@/components/core/EventSearchBar';
import { EventCard } from '@/components/events/EventCard';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';
import { EventCardSkeleton } from '@/components/skeleton/EventCardSkeleton';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { countActiveFilters, useEventsFilters } from '@/hooks/events/useEventsFilters';
import { useFilteredMobileEvents } from '@/hooks/events/useFilteredMobileEvents';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import type { MobileSearchResult } from '@/hooks/search/useEventSearch';

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
  const appliedSeriesSelectionRef = useRef<string | null>(null);

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

  const { categories, error, events, hasMore, isFetchingMore, loadMore, loading, refetch, totalEvents } =
    useFilteredMobileEvents(appliedFilters, authToken, selectedEventId || undefined);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
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

  const serverFilterCount = countActiveFilters(appliedFilters);
  const totalActiveFilterCount =
    serverFilterCount + Number(Boolean(searchQuery.trim() && !selectedEventId)) + Number(Boolean(selectedEventId));

  const filtersKey = JSON.stringify(appliedFilters);
  const infiniteScroll = useInfiniteScroll({
    enabled: hasMore && (!Boolean(searchQuery.trim()) || Boolean(selectedEventId)),
    loading: loading || isFetchingMore,
    onEndReached: () => void loadMore(),
    resetKey: `${filtersKey}:${searchQuery}:${selectedEventId}`,
  });
  const visibleEventCount = selectedEventId ? totalEvents : searchQuery.trim() ? filteredEvents.length : totalEvents;

  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedEventId('');
    clearAllFilters();
  };
  const activeSearchLabel = searchQuery.trim();
  const eventsToolbarProps = {
    center: <Text style={[styles.toolbarTitle, { color: theme.colors.textPrimary }]}>Events</Text>,
    right: (
      <View style={styles.toolbarActions}>
        <EventSearchBar
          onSelectEvent={(event) => {
            clearAllFilters();
            applySeriesSelection(event, setSearchQuery, setSelectedEventId);
          }}
          renderTrigger={({ open }) => (
            <HeaderIconButton accessibilityLabel="Search events" icon="search" onPress={open} />
          )}
        />
        <HeaderIconButton
          accessibilityLabel="Open filters"
          badgeCount={totalActiveFilterCount}
          icon="sliders"
          onPress={openSheet}
        />
      </View>
    ),
  };

  return (
    <MainTabScreenLayout toolbarProps={eventsToolbarProps}>
      <PageContainer
        onContentSizeChange={infiniteScroll.onContentSizeChange}
        onRefresh={onRefresh}
        onScroll={infiniteScroll.onScroll}
        refreshing={refreshing}
        scrollEventThrottle={infiniteScroll.scrollEventThrottle}
      >
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

        {serverFilterCount > 0 ? (
          <View style={styles.activeFilterRow}>
            {appliedFilters.dateOption ? (
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
        ) : (
          <Text style={[styles.eventsCount, { color: theme.colors.textPrimary }]}>
            {visibleEventCount} Events Found
          </Text>
        )}

        {loading && events.length === 0 ? (
          <View style={styles.feedList}>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </View>
        ) : error ? (
          <StateNotice
            actionLabel="Retry"
            message="The event feed failed to load."
            onPressAction={() => void refetch()}
          />
        ) : filteredEvents.length > 0 ? (
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
        ) : (
          <StateNotice message="No events match your current search or filter." />
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
