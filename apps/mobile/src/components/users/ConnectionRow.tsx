import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { RemoteImage } from '@/components/core/RemoteImage';

type ConnectionRowProps = {
  avatarShape?: 'circle' | 'rounded';
  description: string;
  imageUrl?: string | null;
  onPress: () => void;
  subtitle: string;
  title: string;
};

const AVATAR_SIZE = 52;

export function ConnectionRow({
  avatarShape = 'circle',
  description,
  imageUrl,
  onPress,
  subtitle,
  title,
}: ConnectionRowProps) {
  const { theme } = useAppTheme();
  const avatarRadius = avatarShape === 'circle' ? AVATAR_SIZE / 2 : 16;
  const fallback = (
    <View
      style={[
        styles.avatarFallback,
        {
          backgroundColor: theme.colors.primarySoft,
          borderRadius: avatarRadius,
        },
      ]}
    >
      <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>{getInitials(title)}</Text>
    </View>
  );

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
      <RemoteImage
        fallback={fallback}
        imageStyle={{ borderRadius: avatarRadius }}
        style={[styles.avatar, { borderRadius: avatarRadius }]}
        uri={imageUrl}
      />

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
        <Text numberOfLines={2} style={[styles.description, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    height: AVATAR_SIZE,
    overflow: 'hidden',
    width: AVATAR_SIZE,
  },
  avatarFallback: {
    alignItems: 'center',
    height: AVATAR_SIZE,
    justifyContent: 'center',
    width: AVATAR_SIZE,
  },
  avatarFallbackText: {
    ...typography.displayBold,
    fontSize: 15,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  subtitle: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});
