import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileNotification } from '@data/graphql/query/Notification/types';
import { formatRelativeTime, getDisplayName, getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';
import { InlineButton } from '@/components/core/InlineButton';

type NotificationRowProps = {
  actionButtons?: Array<{
    label: string;
    onPress: () => void;
    tone?: 'neutral' | 'primary';
  }>;
  actorImageUrl?: string | null;
  actorLabel?: string;
  isRead?: boolean;
  message: string;
  onPress?: () => void;
  secondaryLabel?: string;
  title: string;
};

export function NotificationRow({
  actionButtons,
  actorImageUrl,
  actorLabel,
  isRead = true,
  message,
  onPress,
  secondaryLabel,
  title,
}: NotificationRowProps) {
  const { theme } = useAppTheme();
  const safeActorLabel = actorLabel || 'Gatherle Member';

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
        {!isRead ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} /> : null}
        {actorImageUrl ? (
          <Image source={{ uri: actorImageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>
              {getInitials(safeActorLabel)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>
        <View style={styles.metaRow}>
          {secondaryLabel ? (
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{secondaryLabel}</Text>
          ) : null}
          {!isRead ? <Feather color={theme.colors.primary} name="bell" size={13} /> : null}
        </View>
        {actionButtons?.length ? (
          <View style={styles.inlineActions}>
            {actionButtons.map((button) => (
              <InlineButton
                key={button.label}
                compact
                label={button.label}
                onPress={button.onPress}
                tone={button.tone ?? 'neutral'}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: 34,
    width: 34,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  avatarFallbackText: {
    ...typography.displayBold,
    fontSize: 12,
  },
  content: {
    flex: 1,
    gap: 3,
    minHeight: 34,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  leading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  message: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 1,
  },
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  time: {
    ...typography.bodyMedium,
    fontSize: 11,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  unreadDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
});
