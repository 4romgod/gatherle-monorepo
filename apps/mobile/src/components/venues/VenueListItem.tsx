import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileVenue } from '@data/graphql/query/Venue/types';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type VenueListItemProps = {
  onPress?: () => void;
  venue: MobileVenue;
};

export function VenueListItem({ onPress, venue }: VenueListItemProps) {
  const { theme } = useAppTheme();
  const location = [venue.address?.city, venue.address?.region, venue.address?.country].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surfaceMuted,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {venue.featuredImageUrl ? (
        <Image source={{ uri: venue.featuredImageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.imageFallback, { backgroundColor: theme.colors.primarySoft }]}>
          <Feather color={theme.colors.primary} name="map-pin" size={18} />
        </View>
      )}

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
          {venue.name}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.colors.textSecondary }]}>
          {venue.type || 'Venue'}
        </Text>
        <Text numberOfLines={2} style={[styles.location, { color: theme.colors.textSecondary }]}>
          {location || 'Address details coming soon'}
        </Text>
      </View>

      <View style={styles.trailing}>
        {venue.capacity ? (
          <Text style={[styles.capacity, { color: theme.colors.primary }]}>{venue.capacity} cap</Text>
        ) : null}
        <Feather color={theme.colors.textMuted} name="chevron-right" size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capacity: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  image: {
    borderRadius: 18,
    height: 66,
    width: 66,
  },
  imageFallback: {
    alignItems: 'center',
    borderRadius: 18,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  location: {
    ...typography.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: 17,
  },
  meta: {
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
  trailing: {
    alignItems: 'flex-end',
    gap: 8,
  },
});
