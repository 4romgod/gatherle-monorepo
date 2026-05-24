import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { InlineButton } from '@/components/core/InlineButton';
import { RemoteImage } from '@/components/core/RemoteImage';

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
  const avatarFallback = actorLabel ? (
    <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
      <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>{getInitials(actorLabel)}</Text>
    </View>
  ) : (
    <View style={[styles.avatarFallback, { backgroundColor: theme.colors.surfaceMuted }]}>
      <Feather color={theme.colors.textMuted} name="user" size={18} />
    </View>
  );

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
        <RemoteImage fallback={avatarFallback} uri={actorImageUrl} style={styles.avatar} />
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.content}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
            {title}
          </Text>
          <Text numberOfLines={2} style={[styles.message, { color: theme.colors.textSecondary }]}>
            {message}
          </Text>
          {secondaryLabel ? (
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{secondaryLabel}</Text>
          ) : null}
        </View>

        {actionButtons?.length ? (
          <View style={styles.trailingActions}>
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
  bodyRow: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  content: {
    flex: 1,
    gap: 3,
    minHeight: 34,
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
    marginTop: 1,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  trailingActions: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 6,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  unreadDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
});
