import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventCard } from '@/features/discovery/components/EventCard';
import { useMobileEventsFeed } from '@/features/discovery/hooks/useMobileDiscovery';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import {
  FilterActionButton,
  FilterChip,
  LoadingBlock,
  PageContainer,
  PageHeading,
  StateNotice,
} from '@/shared/ui/PagePrimitives';
import { SearchField } from '@/shared/ui/SearchField';
import { typography } from '@/shared/theme/typography';

export function EventsScreen() {
  const { theme } = useAppTheme();
  const { categories, error, events, loading, refetch } = useMobileEventsFeed();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory =
        !selectedCategoryId ||
        (event.eventSeries?.eventCategories ?? []).some((category) => category.eventCategoryId === selectedCategoryId);

      const haystack = [
        event.eventSeries?.title,
        event.eventSeries?.summary,
        event.eventSeries?.description,
        event.eventSeries?.organization?.name,
        event.eventSeries?.location?.address?.city,
        event.eventSeries?.location?.address?.state,
        ...(event.eventSeries?.eventCategories ?? []).map((category) => category.name ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesCategory && matchesSearch;
    });
  }, [events, searchQuery, selectedCategoryId]);

  const activeFilterCount = Number(Boolean(selectedCategoryId)) + Number(Boolean(searchQuery.trim()));

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId(null);
    setShowCategoryPicker(false);
  };

  return (
    <PageContainer>
      <PageHeading title="Discover Events" />
      <SearchField
        onChangeText={setSearchQuery}
        placeholder="Search events by title, location, or category..."
        value={searchQuery}
      />

      <View style={styles.eventsToolsRow}>
        <FilterActionButton
          activeCount={activeFilterCount}
          onPress={() => setShowCategoryPicker((current) => !current)}
        />
        {activeFilterCount > 0 ? (
          <Pressable
            onPress={clearAllFilters}
            style={({ pressed }) => [styles.clearAction, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.clearActionText, { color: theme.colors.textSecondary }]}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.activeFilterRow}>
        <FilterChip active label="Upcoming" onPress={() => undefined} tone="success" />
        {selectedCategoryId ? (
          <FilterChip
            active
            label={categories.find((category) => category.eventCategoryId === selectedCategoryId)?.name ?? 'Category'}
            onPress={() => setSelectedCategoryId(null)}
          />
        ) : null}
      </View>

      {showCategoryPicker ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.horizontalFilterList}>
            <FilterChip active={!selectedCategoryId} label="All" onPress={() => setSelectedCategoryId(null)} />
            {categories.map((category) => (
              <FilterChip
                active={selectedCategoryId === category.eventCategoryId}
                key={category.eventCategoryId}
                label={category.name ?? 'Category'}
                onPress={() =>
                  setSelectedCategoryId((current) =>
                    current === category.eventCategoryId ? null : category.eventCategoryId,
                  )
                }
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      <Text style={[styles.eventsCount, { color: theme.colors.textPrimary }]}>
        {filteredEvents.length} Events Found
      </Text>

      {loading && events.length === 0 ? (
        <LoadingBlock label="Loading live events..." />
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="The event feed failed to load."
          onPressAction={() => void refetch()}
        />
      ) : filteredEvents.length > 0 ? (
        <View style={styles.feedList}>
          {filteredEvents.map((event) => (
            <EventCard key={event.occurrenceId} occurrence={event} variant="feed" />
          ))}
        </View>
      ) : (
        <StateNotice message="No events match your current search or filter." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  activeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  clearAction: {
    justifyContent: 'center',
  },
  clearActionText: {
    ...typography.bodyMedium,
    fontSize: 16,
  },
  eventsCount: {
    ...typography.bodyBold,
    fontSize: 20,
    marginTop: 8,
  },
  eventsToolsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  feedList: {
    gap: 24,
  },
  horizontalFilterList: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
});
