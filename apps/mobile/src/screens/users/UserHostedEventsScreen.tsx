import { useCallback } from 'react';
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
  const { error, hasMore, hostedEvents, loading, loadingMore, loadMore, refetch, totalCount } = useHostedEventsByUser(
    userId,
    authToken,
  );
  const resolvedName = displayName ?? username ?? 'This member';
  const resolvedTotalCount = totalCount || initialTotalCount;
  const isOwnProfile = viewerUserId === userId;
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
          subtitle={`Loading hosted events for ${resolvedName}.`}
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
          subtitle={`We couldn’t load hosted events for ${resolvedName}.`}
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
      <PageHeading
        subtitle={
          resolvedTotalCount > 0
            ? `${resolvedName} has hosted ${resolvedTotalCount} event${resolvedTotalCount === 1 ? '' : 's'}.`
            : `${resolvedName} has not hosted any events yet.`
        }
        title={isOwnProfile ? 'Your hosted events' : 'Hosted events'}
      />

      {hostedEvents.length === 0 ? (
        <ProfileEventsEmptyState
          ctaLabel={isOwnProfile ? 'Create Your First Event' : 'Explore Events'}
          description="Start hosting events and they'll appear here"
          icon="calendar"
          onPressCta={() =>
            isOwnProfile ? navigation.navigate('CreateEvent') : navigation.navigate('MainTabs', { screen: 'Events' })
          }
          title="No events hosted yet"
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
