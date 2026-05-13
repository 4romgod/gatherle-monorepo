import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileNotification } from '@data/graphql/query/Notification/types';
import { formatRelativeTime, getDisplayName, getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type NotificationRowProps = {
  notification: MobileNotification;
  onDelete?: () => void;
  onMarkRead?: () => void;
  onPress?: () => void;
};

export function NotificationRow({ notification, onDelete, onMarkRead, onPress }: NotificationRowProps) {
  const { theme } = useAppTheme();
  const actorLabel = getDisplayName(notification.actor);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.leading}>
        {!notification.isRead ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} /> : null}
        {notification.actor?.profile_picture ? (
          <Image source={{ uri: notification.actor.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>{getInitials(actorLabel)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
          {notification.title}
        </Text>
        <Text numberOfLines={2} style={[styles.message, { color: theme.colors.textSecondary }]}>
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>

      <View style={styles.actions}>
        {onMarkRead ? (
          <Pressable hitSlop={8} onPress={onMarkRead} style={styles.actionButton}>
            <Feather color={theme.colors.textSecondary} name="mail" size={20} />
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable hitSlop={8} onPress={onDelete} style={styles.actionButton}>
            <Feather color={theme.colors.textSecondary} name="trash-2" size={20} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  avatar: {
    borderRadius: 999,
    height: 40,
    width: 40,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarFallbackText: {
    ...typography.displayBold,
    fontSize: 14,
  },
  content: {
    flex: 1,
    gap: 4,
    minHeight: 40,
  },
  leading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  message: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 18,
  },
  time: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  unreadDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
});
