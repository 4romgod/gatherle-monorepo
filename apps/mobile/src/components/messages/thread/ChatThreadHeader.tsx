import { StyleSheet, Text, View } from 'react-native';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type ChatThreadHeaderProps = {
  avatarUrl?: string | null;
  displayName: string;
  username?: string | null;
};

export function ChatThreadHeader({ avatarUrl, displayName, username }: ChatThreadHeaderProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <ProfileAvatar imageUrl={avatarUrl} label={displayName} size={42} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.name, { color: theme.colors.textPrimary }]}>
          {displayName}
        </Text>
        {username ? <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>@{username}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
  },
  handle: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 2,
    paddingTop: 2,
  },
  name: {
    ...typography.bodyBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
});
