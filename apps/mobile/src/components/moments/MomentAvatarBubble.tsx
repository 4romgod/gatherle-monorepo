import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type MomentAuthorLike = {
  family_name?: string | null;
  given_name?: string | null;
  profile_picture?: string | null;
  username?: string | null;
};

interface MomentAvatarBubbleProps {
  author?: MomentAuthorLike | null;
  label?: string;
  onPress?: () => void;
  showLabel?: boolean;
  variant?: 'active' | 'pending' | 'failed';
}

export function MomentAvatarBubble({
  author,
  label,
  onPress,
  showLabel = true,
  variant = 'active',
}: MomentAvatarBubbleProps) {
  const { theme } = useAppTheme();
  const displayLabel = label ?? getDisplayName(author);
  const ringColors: readonly [string, string] =
    variant === 'failed'
      ? [theme.colors.error, theme.colors.error]
      : variant === 'pending'
        ? [theme.colors.surfaceRaised, theme.colors.surfaceRaised]
        : theme.colors.heroGradient;

  return (
    <Pressable onPress={onPress} style={styles.shell}>
      <LinearGradient colors={ringColors} style={styles.ring}>
        <View style={[styles.innerRing, { backgroundColor: theme.colors.background }]}>
          <ProfileAvatar imageUrl={author?.profile_picture} label={displayLabel} size={62} />
        </View>
      </LinearGradient>
      {showLabel ? (
        <Text numberOfLines={1} style={[styles.label, { color: theme.colors.textSecondary }]}>
          {displayLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  innerRing: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    padding: 2,
  },
  label: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
    maxWidth: 76,
    textAlign: 'center',
  },
  ring: {
    borderRadius: 999,
    padding: 2.5,
  },
  shell: {
    alignItems: 'center',
    gap: 6,
    width: 76,
  },
});
