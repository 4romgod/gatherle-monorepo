import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { SectionHeading } from '@/components/core/SectionHeading';

export type HomeBrowseItem = {
  badgeLabel?: string;
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
};

type HomeBrowseSectionProps = {
  items: HomeBrowseItem[];
};

export function HomeBrowseSection({ items }: HomeBrowseSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.section}>
      <SectionHeading
        eyebrow="Discovery lanes"
        subtitle="Browse by category, host, venue, or community when you want to widen the search."
        title="Explore more"
      />

      <View style={styles.row}>
        {items.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={styles.pillContent}>
              <Feather color={theme.colors.primary} name={item.icon} size={15} />
              <Text style={[styles.pillLabel, { color: theme.colors.textPrimary }]}>{item.label}</Text>
              {item.badgeLabel ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>{item.badgeLabel}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: MOBILE_RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
  },
  pill: {
    borderRadius: MOBILE_RADIUS.pill,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  pillLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  section: {
    gap: 12,
  },
});
