import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { ProfileEventsEmptyState } from '@/components/account/ProfileEventsEmptyState';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { EventTileGrid } from '@/components/events/EventTileGrid';
import { EventTileGridSkeleton } from '@/components/skeleton/EventTileGridSkeleton';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useHostedEventsByUser } from '@/hooks/events/useHostedEventsByUser';

type UserHostedEventsRoute = RouteProp<RootStackParamList, 'UserHostedEvents'>;

export function UserHostedEventsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<UserHostedEventsRoute>();
  const { authToken, userId: viewerUserId } = useAppShell();
  const { theme } = useAppTheme();
  const { displayName, totalCount: initialTotalCount = 0, userId, username } = route.params;
  const [query, setQuery] = useState('');
  const { error, hasMore, hostedEvents, loading, loadingMore, loadMore, refetch, totalCount } = useHostedEventsByUser(
    userId,
    authToken,
    { searchTerm: query },
  );
  const resolvedName = displayName ?? username ?? 'This member';
  const resolvedTotalCount = totalCount || initialTotalCount;
  const isOwnProfile = viewerUserId === userId;
  const trimmedQuery = query.trim();
  const subtitle = useMemo(() => {
    const basePrefix = isOwnProfile ? 'You have' : `${resolvedName} has`;
    const countLabel = `${resolvedTotalCount} event${resolvedTotalCount === 1 ? '' : 's'}`;

    if (trimmedQuery.length >= 2) {
      const resultLabel = `${hostedEvents.length} match${hostedEvents.length === 1 ? '' : 'es'}`;
      return `${resultLabel} across ${countLabel} hosted by ${isOwnProfile ? 'you' : resolvedName}.`;
    }

    return resolvedTotalCount > 0 ? `${basePrefix} hosted ${countLabel}.` : `${basePrefix} not hosted any events yet.`;
  }, [hostedEvents.length, isOwnProfile, resolvedName, resolvedTotalCount, trimmedQuery.length]);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );
  const infiniteScroll = useInfiniteScroll({
    enabled: hasMore,
    loading: loading || loadingMore,
    onEndReached: loadMore,
    resetKey: `${userId}:${hostedEvents.length}`,
  });

  if (loading && hostedEvents.length === 0) {
    return (
      <PageContainer>
        <PageHeading
          subtitle={`Loading hosted events for ${isOwnProfile ? 'you' : resolvedName}.`}
          title={isOwnProfile ? 'Your hosted events' : 'Hosted events'}
        />
        <EventTileGridSkeleton count={6} />
      </PageContainer>
    );
  }

  if (error && hostedEvents.length === 0) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <PageHeading
          subtitle={`We couldn’t load hosted events for ${isOwnProfile ? 'you' : resolvedName}.`}
          title={isOwnProfile ? 'Your hosted events' : 'Hosted events'}
        />
        <StateNotice actionLabel="Retry" message="Try reloading this list." onPressAction={() => void refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      onContentSizeChange={infiniteScroll.onContentSizeChange}
      onRefresh={onRefresh}
      onScroll={infiniteScroll.onScroll}
      refreshing={refreshing}
      scrollEventThrottle={infiniteScroll.scrollEventThrottle}
    >
      <PageHeading subtitle={subtitle} title={isOwnProfile ? 'Your hosted events' : 'Hosted events'} />
      <SearchField
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        placeholder="Search hosted events"
        value={query}
      />

      {hostedEvents.length === 0 ? (
        <ProfileEventsEmptyState
          ctaLabel={isOwnProfile ? 'Create Your First Event' : 'Explore Events'}
          description={
            trimmedQuery.length >= 2
              ? 'Try a different title, slug, location, or category.'
              : "Start hosting events and they'll appear here"
          }
          icon="calendar"
          onPressCta={() =>
            isOwnProfile ? navigation.navigate('CreateEvent') : navigation.navigate('MainTabs', { screen: 'Events' })
          }
          title={trimmedQuery.length >= 2 ? 'No hosted events match that search' : 'No events hosted yet'}
        />
      ) : (
        <View style={styles.section}>
          <EventTileGrid
            occurrences={hostedEvents}
            onPressEvent={(occurrence) => navigation.navigate('EventDetails', { occurrence })}
          />
          {loadingMore ? (
            <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>Loading more…</Text>
          ) : null}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingMoreText: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  section: {
    gap: 14,
  },
});
