import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { formatShortDate, getEventImageUrl, getEventStatusLabel, getEventTitle } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';
import { RemoteImage } from '@/components/core/RemoteImage';

type ProfileEventTileProps = {
  occurrence: MobileEventOccurrence;
  onPress: () => void;
  size?: number;
};

export function ProfileEventTile({ occurrence, onPress, size }: ProfileEventTileProps) {
  const { theme } = useAppTheme();
  const imageUrl = getEventImageUrl(occurrence);
  const imageFallback = (
    <LinearGradient colors={theme.colors.heroGradient} style={styles.profileEventPlaceholder}>
      <Text style={[styles.profileEventPlaceholderText, { color: theme.colors.heroText }]}>
        {getEventTitle(occurrence).charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileEventTile,
        {
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.94 : 1,
          width: size ?? '31.8%',
        },
      ]}
    >
      <RemoteImage fallback={imageFallback} uri={imageUrl} style={styles.profileEventImage} />

      <View style={styles.profileEventOverlay} />
      <LinearGradient
        colors={['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.18)', 'rgba(15, 23, 42, 0.82)']}
        style={styles.profileEventBottomFade}
      />

      <View
        style={[
          styles.profileEventBadge,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.profileEventBadgeText, { color: theme.colors.primary }]}>
          {getEventStatusLabel(occurrence)}
        </Text>
      </View>

      <View style={styles.profileEventMeta}>
        <Text numberOfLines={2} style={[styles.profileEventTitle, { color: theme.colors.heroText }]}>
          {getEventTitle(occurrence)}
        </Text>
        <Text numberOfLines={1} style={[styles.profileEventDate, { color: theme.colors.textMuted }]}>
          {formatShortDate(occurrence.startAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileEventBadge: {
    borderRadius: MOBILE_RADIUS.pill,
    borderWidth: 1,
    left: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    top: 5,
  },
  profileEventBadgeText: {
    ...typography.bodyBold,
    fontSize: 8,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  profileEventDate: {
    ...typography.bodyMedium,
    fontSize: 11,
    textShadowColor: 'rgba(15, 23, 42, 0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileEventBottomFade: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  profileEventImage: {
    height: '100%',
    width: '100%',
  },
  profileEventMeta: {
    bottom: 8,
    left: 8,
    position: 'absolute',
    right: 8,
  },
  profileEventOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  profileEventPlaceholder: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  profileEventPlaceholderText: {
    ...typography.displayBold,
    fontSize: 28,
  },
  profileEventTile: {
    aspectRatio: 16 / 9,
    borderRadius: MOBILE_RADIUS.control,
    overflow: 'hidden',
    position: 'relative',
  },
  profileEventTitle: {
    ...typography.bodyBold,
    fontSize: 12,
    lineHeight: 15,
    textShadowColor: 'rgba(15, 23, 42, 0.84)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
