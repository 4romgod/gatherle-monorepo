import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EventCard } from '@/features/discovery/components/EventCard';
import { useMobileHomeDiscovery } from '@/features/discovery/hooks/useMobileDiscovery';
import { dedupeOccurrencesBySeries } from '@/features/discovery/lib/mobileFormatters';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { SearchField } from '@/shared/ui/SearchField';
import { FilterChip, LoadingBlock, PageContainer, SectionHeading, StateNotice } from '@/shared/ui/PagePrimitives';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';

function DotsIndicator({ activeIndex, count }: { activeIndex: number; count: number }) {
  const { theme } = useAppTheme();

  if (count <= 1) {
    return null;
  }

  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`dot-${index}`}
          style={[
            styles.dot,
            {
              backgroundColor: index === activeIndex ? theme.colors.primary : theme.colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

function buildRecommendedEvents(trendingEvents: MobileEventOccurrence[], upcomingEvents: MobileEventOccurrence[]) {
  return dedupeOccurrencesBySeries([...trendingEvents, ...upcomingEvents], 5);
}

export function HomeScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { isAuthenticated } = useAppShell();
  const { width } = useWindowDimensions();
  const { categories, heroEvent, loading, error, refetch, trendingEvents, upcomingEvents } = useMobileHomeDiscovery();
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const cardWidth = Math.max(width - 40, 280);

  const carouselEvents = useMemo(
    () => (isAuthenticated ? upcomingEvents : trendingEvents).slice(0, 3),
    [isAuthenticated, trendingEvents, upcomingEvents],
  );
  const recommendedEvents = useMemo(
    () => buildRecommendedEvents(trendingEvents, upcomingEvents).slice(0, 4),
    [trendingEvents, upcomingEvents],
  );

  return (
    <PageContainer>
      <SearchField
        onChangeText={setSearchQuery}
        placeholder="Search events, categories, or locations..."
        value={searchQuery}
      />

      <SectionHeading
        actionLabel="View all"
        onPressAction={() => navigation.navigate('Events')}
        title={isAuthenticated ? 'Your Upcoming RSVPs' : 'Featured Events'}
      />

      {loading && carouselEvents.length === 0 && !heroEvent ? (
        <LoadingBlock label="Loading your next events..." />
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load the discovery feed just now."
          onPressAction={() => void refetch()}
        />
      ) : carouselEvents.length > 0 ? (
        <>
          <ScrollView
            horizontal
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const nextIndex = Math.round(offsetX / (cardWidth + 12));
              setActiveSlide(Math.max(0, Math.min(nextIndex, carouselEvents.length - 1)));
            }}
            showsHorizontalScrollIndicator={false}
            snapToAlignment="start"
            snapToInterval={cardWidth + 12}
            style={styles.carousel}
          >
            {carouselEvents.map((event, index) => (
              <View
                key={event.occurrenceId}
                style={[
                  styles.carouselItem,
                  { marginRight: index === carouselEvents.length - 1 ? 0 : 12, width: cardWidth },
                ]}
              >
                <EventCard cardWidth="100%" occurrence={event} variant="featured" />
              </View>
            ))}
          </ScrollView>
          <DotsIndicator activeIndex={activeSlide} count={carouselEvents.length} />
        </>
      ) : (
        <StateNotice message="No upcoming events are available yet." />
      )}

      <SectionHeading
        actionLabel="See all events"
        onPressAction={() => navigation.navigate('Events')}
        title="Recommended For You"
      />

      {recommendedEvents.length > 0 ? (
        <View style={styles.feedList}>
          {recommendedEvents.map((event) => (
            <EventCard key={event.occurrenceId} occurrence={event} variant="feed" />
          ))}
        </View>
      ) : (
        <StateNotice message="Recommendations will appear here once more public events are available." />
      )}

      {categories.length > 0 ? (
        <View style={styles.categoryWrap}>
          {categories.slice(0, 4).map((category) => (
            <FilterChip
              key={category.eventCategoryId}
              label={category.name ?? 'Category'}
              onPress={() => navigation.navigate('Categories')}
            />
          ))}
        </View>
      ) : null}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  carousel: {
    marginHorizontal: -20,
  },
  carouselItem: {
    paddingLeft: 20,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 4,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  feedList: {
    gap: 24,
  },
});
