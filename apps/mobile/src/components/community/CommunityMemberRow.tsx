import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileDirectoryUser } from '@data/graphql/query/User/types';
import { getDisplayName, getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { InlineButton } from '@/components/core/InlineButton';

type CommunityMemberRowProps = {
  actionTone?: 'neutral' | 'primary';
  onPress?: () => void;
  primaryActionLabel?: string;
  onPressPrimaryAction?: () => void;
  user: MobileDirectoryUser;
};

export function CommunityMemberRow({
  actionTone = 'neutral',
  onPress,
  onPressPrimaryAction,
  primaryActionLabel,
  user,
}: CommunityMemberRowProps) {
  const { theme } = useAppTheme();
  const displayName = getDisplayName(user);
  const location = [user.location?.city, user.location?.state, user.location?.country].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surfaceRaised,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {user.profile_picture ? (
        <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
          <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>{getInitials(displayName)}</Text>
        </View>
      )}

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
          {displayName}
        </Text>
        <Text numberOfLines={1} style={[styles.handle, { color: theme.colors.primary }]}>
          @{user.username}
        </Text>
        <Text numberOfLines={2} style={[styles.bio, { color: theme.colors.textSecondary }]}>
          {user.bio || location || 'Gatherle community member'}
        </Text>
      </View>

      {primaryActionLabel && onPressPrimaryAction ? (
        <InlineButton compact label={primaryActionLabel} onPress={onPressPrimaryAction} tone={actionTone} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: 52,
    width: 52,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarFallbackText: {
    ...typography.displayBold,
    fontSize: 15,
  },
  bio: {
    ...typography.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: 17,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  handle: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  row: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  title: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
});
