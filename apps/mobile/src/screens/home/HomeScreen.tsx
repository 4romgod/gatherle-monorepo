import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainTabScreenLayout } from '@/app/navigation/MainTabScreenLayout';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { EventPreviewCarousel } from '@/components/carousel/EventPreviewCarousel';
import { EventSearchBar } from '@/components/core/EventSearchBar';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { EventCard } from '@/components/events/EventCard';
import { FollowedMomentsStrip } from '@/components/moments/FollowedMomentsStrip';
import { EventCardSkeleton } from '@/components/skeleton/EventCardSkeleton';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { useMyUpcomingRsvps } from '@/hooks/home/useMyUpcomingRsvps';
import { useFollowedMoments } from '@/hooks/moments/useFollowedMoments';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { dedupeOccurrencesBySeries } from '@/lib/events/formatters';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import type { MobileSearchResult } from '@/hooks/search/useEventSearch';

function buildRecommendedEvents(trendingEvents: MobileEventOccurrence[], upcomingEvents: MobileEventOccurrence[]) {
  return dedupeOccurrencesBySeries([...trendingEvents, ...upcomingEvents], 5);
}

function navigateToEventSeriesResults(navigation: MainTabNavigation, event: MobileSearchResult) {
  navigation.navigate('Events', {
    initialEventId: event.eventId,
    initialSearch: event.title ?? '',
  });
}

export function HomeScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, isAuthenticated } = useAppShell();
  const { width } = useWindowDimensions();
  const { heroEvent, loading, error, refetch, trendingEvents, upcomingEvents } = useMobileHomeDiscovery(authToken);
  const { upcomingRsvps, refetch: refetchRsvps } = useMyUpcomingRsvps(isAuthenticated ? authToken : null);
  const {
    moments: followedMoments,
    refetch: refetchFollowedMoments,
    error: followedMomentsError,
  } = useFollowedMoments(authToken);
  const cardWidth = Math.max(width - 40, 280);

  useEffect(() => {
    if (followedMomentsError) {
      console.warn('[HomeScreen] Failed to load followed moments:', followedMomentsError.message);
    }
  }, [followedMomentsError]);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetch(), refetchFollowedMoments(), refetchRsvps()]);
    }, [refetch, refetchFollowedMoments, refetchRsvps]),
  );

  const carouselEvents = useMemo(
    () => (isAuthenticated ? upcomingRsvps : trendingEvents.slice(0, 3)),
    [isAuthenticated, trendingEvents, upcomingRsvps],
  );
  const recommendedEvents = useMemo(
    () => buildRecommendedEvents(trendingEvents, upcomingEvents).slice(0, 4),
    [trendingEvents, upcomingEvents],
  );

  return (
    <MainTabScreenLayout>
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        {isAuthenticated && followedMoments.length > 0 ? <FollowedMomentsStrip moments={followedMoments} /> : null}

        <EventSearchBar onSelectEvent={(event) => navigateToEventSeriesResults(navigation, event)} />

        <SectionHeading
          actionLabel="View all"
          onPressAction={() => navigation.navigate('Events')}
          title={isAuthenticated ? 'Your Upcoming RSVPs' : 'Featured Events'}
        />

        {loading && carouselEvents.length === 0 && !heroEvent ? (
          <EventCardSkeleton cardWidth={cardWidth} variant="featured" />
        ) : error ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load the discovery feed just now."
            onPressAction={() => void refetch()}
          />
        ) : carouselEvents.length > 0 ? (
          <EventPreviewCarousel
            cardWidth={cardWidth}
            events={carouselEvents}
            onPressEvent={(event) => navigation.navigate('EventDetails', { occurrence: event })}
          />
        ) : (
          <StateNotice
            message={isAuthenticated ? 'You have no upcoming RSVPs yet.' : 'No upcoming events are available yet.'}
          />
        )}

        <SectionHeading
          actionLabel="See all events"
          onPressAction={() => navigation.navigate('Events')}
          title="Recommended For You"
        />

        {recommendedEvents.length > 0 ? (
          <View style={styles.feedList}>
            {recommendedEvents.map((event) => (
              <EventCard
                key={event.occurrenceId}
                occurrence={event}
                onPress={() => navigation.navigate('EventDetails', { occurrence: event })}
                variant="feed"
              />
            ))}
          </View>
        ) : loading ? (
          <View style={styles.feedList}>
            <EventCardSkeleton />
            <EventCardSkeleton />
          </View>
        ) : (
          <StateNotice message="Recommendations will appear here once more public events are available." />
        )}
      </PageContainer>
    </MainTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  feedList: {
    gap: 24,
  },
});
