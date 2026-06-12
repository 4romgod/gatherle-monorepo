import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HeaderIconButton } from '@/app/navigation/HeaderIconButton';
import { MainTabScreenLayout } from '@/app/navigation/MainTabScreenLayout';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { EventPreviewCarousel } from '@/components/carousel/EventPreviewCarousel';
import { EventSearchBar } from '@/components/core/EventSearchBar';
import { PageContainer } from '@/components/core/PageContainer';
import { ScreenErrorState } from '@/components/core/ScreenErrorState';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { EventCard } from '@/components/events/EventCard';
import { HomeBrowseSection } from '@/components/home/HomeBrowseSection';
import type { HomeBrowseItem } from '@/components/home/HomeBrowseSection';
import { FollowedMomentsStrip } from '@/components/moments/FollowedMomentsStrip';
import { EventCardSkeleton } from '@/components/skeleton/EventCardSkeleton';
import { useSessionExpiryRedirect } from '@/hooks/core/useSessionExpiryRedirect';
import { useMobileHomeDiscovery } from '@/hooks/home/useHomeDiscovery';
import { useMyUpcomingRsvps } from '@/hooks/home/useMyUpcomingRsvps';
import { useFollowedMoments } from '@/hooks/moments/useFollowedMoments';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { buildRecommendedOccurrences } from '@/lib/events/formatters';
import { reportFrontendError } from '@/lib/errors/reportFrontendError';
import { getResponsiveContentWidth } from '@/lib/constants/layout';
import type { MobileSearchResult } from '@/hooks/search/useEventSearch';

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
  const {
    error: upcomingRsvpsError,
    loading: upcomingRsvpsLoading,
    upcomingRsvps,
    refetch: refetchRsvps,
  } = useMyUpcomingRsvps(isAuthenticated ? authToken : null);
  const {
    moments: followedMoments,
    refetch: refetchFollowedMoments,
    error: followedMomentsError,
  } = useFollowedMoments(authToken);
  const [searchVisible, setSearchVisible] = useState(false);
  const cardWidth = Math.max(getResponsiveContentWidth(width), 280);

  useEffect(() => {
    if (followedMomentsError) {
      reportFrontendError('HomeScreen failed to load followed moments', followedMomentsError);
    }
  }, [followedMomentsError]);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetch(), refetchFollowedMoments(), refetchRsvps()]);
    }, [refetch, refetchFollowedMoments, refetchRsvps]),
  );
  const failureKind = useSessionExpiryRedirect({
    error: error ?? upcomingRsvpsError ?? followedMomentsError,
    redirectTab: 'Home',
  });
  const primarySectionError = isAuthenticated ? upcomingRsvpsError : error;
  const primarySectionLoading = isAuthenticated ? upcomingRsvpsLoading : loading;
  const recommendationsError = error;

  const carouselEvents = useMemo(
    () => (isAuthenticated ? upcomingRsvps : trendingEvents.slice(0, 3)),
    [isAuthenticated, trendingEvents, upcomingRsvps],
  );
  const recommendedEvents = useMemo(
    () => buildRecommendedOccurrences(trendingEvents, upcomingEvents, upcomingRsvps, 4),
    [trendingEvents, upcomingEvents, upcomingRsvps],
  );
  const browseItems = useMemo<HomeBrowseItem[]>(
    () => [
      {
        icon: 'grid',
        label: 'Categories',
        onPress: () => navigation.navigate('Categories'),
      },
      {
        icon: 'briefcase',
        label: 'Organizations',
        onPress: () => navigation.navigate('Organizations'),
      },
      {
        icon: 'map-pin',
        label: 'Venues',
        onPress: () => navigation.navigate('Venues'),
      },
      {
        badgeLabel: isAuthenticated ? undefined : 'Login',
        icon: 'users',
        label: 'People',
        onPress: () => navigation.navigate('Community'),
      },
    ],
    [isAuthenticated, navigation],
  );
  const homeToolbarProps = {
    right: <HeaderIconButton accessibilityLabel="Search events" icon="search" onPress={() => setSearchVisible(true)} />,
  };

  return (
    <MainTabScreenLayout
      overlay={
        <EventSearchBar
          onClose={() => setSearchVisible(false)}
          onSelectEvent={(event) => navigateToEventSeriesResults(navigation, event)}
          visible={searchVisible}
        />
      }
      toolbarProps={homeToolbarProps}
    >
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        {isAuthenticated && followedMoments.length > 0 ? <FollowedMomentsStrip moments={followedMoments} /> : null}
        {isAuthenticated &&
        followedMoments.length === 0 &&
        followedMomentsError &&
        failureKind !== 'session-expired' ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load the moments from people you follow. Pull to refresh or try again."
            onPressAction={() => void refetchFollowedMoments()}
            title="Followed moments unavailable"
            tone="error"
          />
        ) : null}

        <SectionHeading
          eyebrow={isAuthenticated ? 'Your plans' : 'Happening now'}
          actionLabel="View all"
          onPressAction={() => navigation.navigate('Events')}
          subtitle={
            isAuthenticated
              ? 'Events you already committed to stay front and center here.'
              : 'A quick read on the events pulling the most attention right now.'
          }
          title={isAuthenticated ? 'Your upcoming RSVPs' : 'Featured events'}
        />

        {primarySectionLoading && carouselEvents.length === 0 && !heroEvent ? (
          <EventCardSkeleton cardWidth={cardWidth} variant="featured" />
        ) : primarySectionError && failureKind !== 'session-expired' ? (
          <ScreenErrorState
            error={primarySectionError}
            onRetry={() => void Promise.all([refetch(), refetchRsvps()])}
            resourceName={isAuthenticated ? 'your plans' : 'the discovery feed'}
          />
        ) : carouselEvents.length > 0 ? (
          <EventPreviewCarousel
            cardWidth={cardWidth}
            events={carouselEvents}
            onPressEvent={(event) => navigation.navigate('EventDetails', { occurrence: event })}
          />
        ) : (
          <StateNotice
            message={
              isAuthenticated
                ? 'Start saving or RSVPing to events that fit your week, and they will land here for quick re-entry.'
                : 'We will surface the busiest public events here as soon as they are live.'
            }
            title={isAuthenticated ? 'Your plans are still empty' : 'Nothing featured yet'}
          />
        )}

        <SectionHeading
          eyebrow="For your taste"
          actionLabel="See all events"
          onPressAction={() => navigation.navigate('Events')}
          subtitle="These picks lean on public momentum, timing, and the kinds of events people like you keep opening."
          title="Recommended for you"
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
        ) : recommendationsError && failureKind !== 'session-expired' ? (
          <ScreenErrorState
            error={recommendationsError}
            onRetry={() => void refetch()}
            resourceName="your recommendations"
          />
        ) : (
          <StateNotice
            message="Browse categories, venues, or hosts to teach Gatherle what kinds of nights and communities you care about."
            onPressAction={() => navigation.navigate('Events')}
            actionLabel="Explore events"
            title="Your recommendation engine needs a little more signal"
          />
        )}

        <HomeBrowseSection items={browseItems} />
      </PageContainer>
    </MainTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  feedList: {
    gap: 24,
  },
});
