import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { formatShortDate, getEventImageUrl, getEventStatusLabel, getEventTitle } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type ProfileEventTileProps = {
  occurrence: MobileEventOccurrence;
  onPress: () => void;
};

export function ProfileEventTile({ occurrence, onPress }: ProfileEventTileProps) {
  const { theme } = useAppTheme();
  const imageUrl = getEventImageUrl(occurrence);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileEventTile,
        {
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.profileEventImage} />
      ) : (
        <LinearGradient colors={theme.colors.heroGradient} style={styles.profileEventPlaceholder}>
          <Text style={[styles.profileEventPlaceholderText, { color: theme.colors.heroText }]}>
            {getEventTitle(occurrence).charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
      )}

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
    borderRadius: 999,
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
    ...StyleSheet.absoluteFillObject,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
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
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    width: '31.8%',
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
