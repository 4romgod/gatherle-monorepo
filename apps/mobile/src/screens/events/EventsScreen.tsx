import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import type { MainTabParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { EventsFilterSheet } from '@/components/events/EventsFilterSheet';
import { FilterActionButton } from '@/components/core/FilterActionButton';
import { FilterChip } from '@/components/core/FilterChip';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { EventSearchBar } from '@/components/core/EventSearchBar';
import { EventCard } from '@/components/events/EventCard';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';
import { EventCardSkeleton } from '@/components/skeleton/EventCardSkeleton';
import { countActiveFilters, useEventsFilters } from '@/hooks/events/useEventsFilters';
import { useFilteredMobileEvents } from '@/hooks/events/useFilteredMobileEvents';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

export function EventsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, userId } = useAppShell();
  const { theme } = useAppTheme();
  const route = useRoute<RouteProp<MainTabParamList, 'Events'>>();
  const [searchQuery, setSearchQuery] = useState(route.params?.initialSearch ?? '');
  const [selectedEventId, setSelectedEventId] = useState(route.params?.initialEventId ?? '');

  const {
    appliedFilters,
    draftFilters,
    sheetVisible,
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

  const { categories, error, events, loading, refetch } = useFilteredMobileEvents(appliedFilters, authToken);
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
  const totalActiveFilterCount = serverFilterCount + Number(Boolean(searchQuery.trim()));

  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination whenever filters or search change
  const filtersKey = JSON.stringify(appliedFilters);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filtersKey, searchQuery]);

  const paginatedEvents = filteredEvents.slice(0, visibleCount);

  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedEventId('');
    clearAllFilters();
  };

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      <EventSearchBar
        onSelectEvent={(event) => {
          setSearchQuery(event.title ?? '');
          setSelectedEventId(event.eventId);
        }}
      />

      {/* Tools row */}
      <View style={styles.eventsToolsRow}>
        <FilterActionButton activeCount={serverFilterCount} onPress={openSheet} />
        {totalActiveFilterCount > 0 ? (
          <Pressable
            onPress={handleClearAll}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, justifyContent: 'center' }]}
          >
            <Text style={[styles.clearActionText, { color: theme.colors.textSecondary }]}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Active filter chips */}
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
          {paginatedEvents.length} Events Found
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
        <>
          <View style={styles.feedList}>
            {paginatedEvents.map((event) => (
              <EventCard
                key={event.occurrenceId}
                occurrence={event}
                onPress={() => navigation.navigate('EventDetails', { occurrence: event })}
                variant="feed"
              />
            ))}
          </View>
          {visibleCount < filteredEvents.length ? (
            <View style={styles.paginationSection}>
              <Text style={[styles.showingText, { color: theme.colors.textMuted }]}>
                Showing {Math.min(visibleCount, filteredEvents.length)}
              </Text>
              <Pressable
                onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                style={({ pressed }) => [
                  styles.showMoreButton,
                  { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.showMoreText, { color: theme.colors.textPrimary }]}>Show more events</Text>
                <Feather color={theme.colors.textPrimary} name="chevron-down" size={16} />
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <StateNotice message="No events match your current search or filter." />
      )}

      <EventsFilterSheet
        categories={categories}
        draft={draftFilters}
        onApply={applyFilters}
        onClearAll={handleClearAll}
        onClearLocation={clearDraftLocation}
        onClose={closeSheet}
        onSetDateOption={setDraftDateOption}
        onSetLocation={setDraftLocation}
        onToggleCategory={toggleDraftCategory}
        onToggleStatus={toggleDraftStatus}
        visible={sheetVisible}
      />
    </PageContainer>
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
  eventsToolsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  feedList: {
    gap: 24,
  },
  paginationSection: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  showingText: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
  },
  showMoreButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: '100%',
  },
  showMoreText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
});
