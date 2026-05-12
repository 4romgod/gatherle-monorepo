import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MobileFollowRequest } from '@data/graphql/query/Follow/types';
import { AuthPromptCard } from '@/features/auth/components/AuthPromptCard';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { NotificationRow } from '@/features/social/components/NotificationRow';
import { useNotifications } from '@/features/social/hooks/useNotifications';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';
import { InlineButton, PageContainer, PageHeading, SmallActionButton, StateNotice } from '@/shared/ui/PagePrimitives';
import { getDisplayName, getInitials } from '@/features/discovery/lib/mobileFormatters';

type NotificationsTabValue = 'all' | 'requests';

function FollowRequestRow({
  onReject,
  onAccept,
  request,
}: {
  onReject: () => void;
  onAccept: () => void;
  request: MobileFollowRequest;
}) {
  const { theme } = useAppTheme();
  const follower = request.follower;
  const displayName = getDisplayName(follower);
  const headline = follower?.bio || 'Requested to follow you.';
  const handle = follower?.username ? `@${follower.username}` : displayName;

  return (
    <View style={[styles.followRequestRow, { borderBottomColor: theme.colors.border }]}>
      {follower?.profile_picture ? (
        <Image source={{ uri: follower.profile_picture }} style={styles.followAvatar} />
      ) : (
        <View style={[styles.followAvatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
          <Text style={[styles.followAvatarFallbackText, { color: theme.colors.primary }]}>
            {getInitials(displayName)}
          </Text>
        </View>
      )}
      <View style={styles.followRequestCopy}>
        <Text style={[styles.followRequestTitle, { color: theme.colors.textPrimary }]}>{handle}</Text>
        <Text style={[styles.followRequestHeadline, { color: theme.colors.textSecondary }]}>{headline}</Text>
      </View>
      <View style={styles.followRequestActions}>
        <InlineButton label="Accept" onPress={onAccept} />
        <InlineButton label="Reject" onPress={onReject} tone="neutral" />
      </View>
    </View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { isAuthenticated, previewAuthToken } = useAppShell();
  const { theme } = useAppTheme();
  const [tab, setTab] = useState<NotificationsTabValue>('all');
  const {
    acceptFollowRequest,
    deleteNotification,
    error,
    followRequests,
    loading,
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    refetch,
    rejectFollowRequest,
    unreadCount,
  } = useNotifications(previewAuthToken, isAuthenticated);

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

  if (!previewAuthToken) {
    return (
      <PageContainer>
        <PageHeading title="Notifications" />
        <StateNotice message="Set EXPO_PUBLIC_AUTH_TOKEN to load your real notifications and follow requests." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeading title="Notifications" />

      <View style={styles.notificationsActions}>
        <SmallActionButton icon="rotate-cw" label="Refresh" onPress={() => void refetch()} />
        <SmallActionButton
          icon="check"
          label="Mark all read"
          onPress={() => void markAllNotificationsRead()}
          tone="outline"
        />
      </View>

      <View style={styles.notificationTabs}>
        <Pressable onPress={() => setTab('all')} style={styles.notificationTabButton}>
          <Text
            style={[
              styles.notificationTabText,
              { color: tab === 'all' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            All {unreadCount > 0 ? `(${unreadCount} unread)` : ''}
          </Text>
          <View
            style={[
              styles.notificationTabUnderline,
              { backgroundColor: tab === 'all' ? theme.colors.primary : 'transparent' },
            ]}
          />
        </Pressable>
        <Pressable onPress={() => setTab('requests')} style={styles.notificationTabButton}>
          <Text
            style={[
              styles.notificationTabText,
              { color: tab === 'requests' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Follow Requests
          </Text>
          <View
            style={[
              styles.notificationTabUnderline,
              { backgroundColor: tab === 'requests' ? theme.colors.primary : 'transparent' },
            ]}
          />
        </Pressable>
      </View>

      <View style={[styles.pageDivider, { backgroundColor: theme.colors.border }]} />

      {tab === 'all' ? (
        loading && notifications.length === 0 ? (
          <StateNotice message="Loading your notifications..." />
        ) : error ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load your notifications."
            onPressAction={() => void refetch()}
          />
        ) : notifications.length > 0 ? (
          <View style={styles.messageList}>
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.notificationId}
                notification={notification}
                onDelete={() => void deleteNotification(notification.notificationId)}
                onMarkRead={() => void markNotificationRead(notification.notificationId)}
                onPress={() => void markNotificationRead(notification.notificationId)}
              />
            ))}
          </View>
        ) : (
          <StateNotice message="You’re all caught up." />
        )
      ) : followRequests.length > 0 ? (
        <View style={styles.messageList}>
          {followRequests.map((request) => (
            <FollowRequestRow
              key={request.followId}
              onAccept={() => void acceptFollowRequest(request.followId)}
              onReject={() => void rejectFollowRequest(request.followId)}
              request={request}
            />
          ))}
        </View>
      ) : (
        <StateNotice message="You have no pending follow requests." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  followAvatar: {
    borderRadius: 999,
    height: 44,
    width: 44,
  },
  followAvatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  followAvatarFallbackText: {
    ...typography.displayBold,
    fontSize: 14,
  },
  followRequestCopy: {
    flex: 1,
    gap: 4,
  },
  followRequestHeadline: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  followRequestRow: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 18,
  },
  followRequestActions: {
    gap: 8,
  },
  followRequestTitle: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  messageList: {
    gap: 0,
  },
  notificationTabButton: {
    flex: 1,
    gap: 12,
    paddingTop: 10,
  },
  notificationTabText: {
    ...typography.bodySemiBold,
    fontSize: 15,
  },
  notificationTabUnderline: {
    borderRadius: 999,
    height: 2,
    width: '100%',
  },
  notificationTabs: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  notificationsActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: -4,
  },
  pageDivider: {
    height: 1,
    marginHorizontal: -20,
  },
});
