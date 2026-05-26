import type { ApolloError } from '@apollo/client';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MobileFollowRequest } from '@data/graphql/query/Follow/types';
import type { MobileNotification } from '@data/graphql/query/Notification/types';
import { NotificationType } from '@data/graphql/types/graphql';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { NotificationRowSkeleton } from '@/components/skeleton/NotificationRowSkeleton';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';
import { getApolloErrorCode } from '@/lib/auth/apolloErrors';
import { SwipeableNotificationRow } from '@/components/notifications/SwipeableNotificationRow';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { formatDateGroupLabel, formatRelativeTime, getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type NotificationFeedItem =
  | { createdAt: string; id: string; kind: 'notification'; notification: MobileNotification }
  | { createdAt: string; id: string; kind: 'follow-request'; request: MobileFollowRequest };

export function NotificationsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, hasLiveSession, isAuthenticated, signOut } = useAppShell();
  const { theme } = useAppTheme();
  const {
    acceptFollowRequest,
    deleteNotification,
    error,
    followBackUser,
    followRequests,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    markNotificationRead,
    notifications,
    refetch,
    rejectFollowRequest,
    unreadCount,
  } = useNotifications(authToken, isAuthenticated);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (!hasLiveSession || !error) {
      return;
    }

    if (getApolloErrorCode(error as ApolloError) !== 'UNAUTHENTICATED') {
      return;
    }

    signOut();
    navigation.navigate('Login', { redirectTab: 'Notifications' });
  }, [error, hasLiveSession, navigation, signOut]);

  const feedItems = useMemo<NotificationFeedItem[]>(() => {
    const notificationItems = notifications.map(
      (notification): NotificationFeedItem => ({
        createdAt: notification.createdAt,
        id: notification.notificationId,
        kind: 'notification',
        notification,
      }),
    );
    const followItems = followRequests.map(
      (request): NotificationFeedItem => ({
        createdAt: request.createdAt,
        id: request.followId,
        kind: 'follow-request',
        request,
      }),
    );

    return [...notificationItems, ...followItems].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [followRequests, notifications]);

  const groupedFeed = useMemo(() => {
    const groups = new Map<string, NotificationFeedItem[]>();

    for (const item of feedItems) {
      const label = formatDateGroupLabel(item.createdAt);
      const current = groups.get(label) ?? [];
      current.push(item);
      groups.set(label, current);
    }

    return Array.from(groups.entries()).map(([label, items]) => ({ items, label }));
  }, [feedItems]);
  const infiniteScroll = useInfiniteScroll({
    enabled: hasMore,
    loading: loading || loadingMore,
    onEndReached: loadMore,
    resetKey: `${groupedFeed.length}:${unreadCount}`,
  });

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeading title="Notifications" />
        <AuthPromptCard
          description="Sign in to see reminders, invites, follow activity, and message nudges from your Gatherle network."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Notifications start after sign-in"
        />
      </PageContainer>
    );
  }

  if (!authToken) {
    return (
      <PageContainer>
        <PageHeading title="Notifications" />
        <StateNotice message="Log in with a real account token to load your notifications and follow requests." />
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
      {loading && feedItems.length === 0 ? (
        <View style={styles.feed}>
          <View style={styles.group}>
            <SkeletonBlock style={styles.groupTitleSkeleton} />
            <View style={styles.groupItems}>
              <NotificationRowSkeleton />
              <NotificationRowSkeleton />
            </View>
          </View>
          <View style={styles.group}>
            <SkeletonBlock style={styles.groupTitleSkeleton} />
            <View style={styles.groupItems}>
              <NotificationRowSkeleton withActions={false} />
              <NotificationRowSkeleton />
            </View>
          </View>
        </View>
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your notifications."
          onPressAction={() => void refetch()}
        />
      ) : groupedFeed.length > 0 ? (
        <View style={styles.feed}>
          {groupedFeed.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>{group.label}</Text>
              <View style={styles.groupItems}>
                {group.items.map((item) =>
                  item.kind === 'notification' ? (
                    <SwipeableNotificationRow
                      actionButtons={buildNotificationActions(item.notification, followBackUser)}
                      actorImageUrl={item.notification.actor?.profile_picture}
                      actorLabel={getDisplayName(item.notification.actor)}
                      isRead={item.notification.isRead}
                      key={item.id}
                      message={item.notification.message}
                      onDelete={() => void deleteNotification(item.notification.notificationId)}
                      onPress={() => void markNotificationRead(item.notification.notificationId)}
                      secondaryLabel={formatRelativeTime(item.notification.createdAt)}
                      title={item.notification.title}
                    />
                  ) : (
                    <SwipeableNotificationRow
                      actionButtons={[
                        {
                          label: 'Accept',
                          onPress: () => void acceptFollowRequest(item.request.followId),
                          tone: 'primary',
                        },
                        {
                          label: 'Decline',
                          onPress: () => void rejectFollowRequest(item.request.followId),
                          tone: 'neutral',
                        },
                      ]}
                      actorImageUrl={item.request.follower?.profile_picture}
                      actorLabel={getDisplayName(item.request.follower)}
                      isRead={false}
                      key={item.id}
                      message={item.request.follower?.bio || 'Requested to follow you.'}
                      onDelete={() => void rejectFollowRequest(item.request.followId)}
                      secondaryLabel={formatRelativeTime(item.request.createdAt)}
                      title={`${item.request.follower?.username ? `@${item.request.follower.username}` : getDisplayName(item.request.follower)} wants to connect`}
                    />
                  ),
                )}
              </View>
            </View>
          ))}
          {loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
            </View>
          ) : null}
        </View>
      ) : (
        <StateNotice message="You’re all caught up." />
      )}
    </PageContainer>
  );
}

function buildNotificationActions(
  notification: MobileNotification,
  followBackUser: (targetId: string) => Promise<void>,
): Array<{ label: string; onPress: () => void; tone?: 'neutral' | 'primary' }> | undefined {
  if (
    (notification.type === NotificationType.FollowAccepted || notification.type === NotificationType.FollowReceived) &&
    notification.actorUserId
  ) {
    return [
      {
        label: 'Follow back',
        onPress: () => void followBackUser(notification.actorUserId!),
        tone: 'primary',
      },
    ];
  }

  return undefined;
}

const styles = StyleSheet.create({
  feed: {
    gap: 18,
  },
  group: {
    gap: 8,
  },
  groupItems: {
    gap: 0,
  },
  groupTitle: {
    ...typography.bodySemiBold,
    fontSize: 12,
  },
  groupTitleSkeleton: {
    height: 12,
    width: 84,
  },
  loadingMore: {
    alignItems: 'center',
    paddingTop: 8,
  },
});
