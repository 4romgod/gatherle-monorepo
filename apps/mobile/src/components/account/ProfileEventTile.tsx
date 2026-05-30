import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [imageResolved, setImageResolved] = useState(!imageUrl);

  useEffect(() => {
    setImageResolved(!imageUrl);
  }, [imageUrl]);

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
      <View style={styles.profileEventImageShell}>
        <RemoteImage
          fallback={imageFallback}
          onError={() => setImageResolved(true)}
          onLoad={() => setImageResolved(true)}
          uri={imageUrl}
          style={[styles.profileEventImage, { backgroundColor: theme.colors.surfaceRaised }]}
        />
      </View>

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

      {imageUrl && !imageResolved ? (
        <View
          pointerEvents="none"
          style={[
            styles.profileEventLoadingOverlay,
            {
              backgroundColor: theme.dark ? 'rgba(2, 6, 23, 0.24)' : 'rgba(255, 255, 255, 0.12)',
            },
          ]}
        >
          <View
            style={[
              styles.profileEventLoadingCard,
              {
                backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.84)' : 'rgba(255, 255, 255, 0.92)',
                borderColor: theme.dark ? theme.colors.heroCardBorder : theme.colors.border,
                shadowColor: theme.colors.heroBackground,
              },
            ]}
          >
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        </View>
      ) : null}
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
    flex: 1,
  },
  profileEventImageShell: {
    flex: 1,
  },
  profileEventLoadingCard: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 62,
    minWidth: 62,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  profileEventLoadingOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
