import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileEventCategory } from '@data/graphql/query/Discovery/types';
import { formatCountLabel } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type CategoryTileProps = {
  category: MobileEventCategory;
  onPress?: () => void;
};

export function CategoryTile({ category, onPress }: CategoryTileProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: category.color ?? theme.colors.primarySoft }]}>
        <Feather color={theme.colors.primaryContrast} name="hash" size={17} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
          {category.name}
        </Text>
        <Text numberOfLines={2} style={[styles.description, { color: theme.colors.textSecondary }]}>
          {category.description || 'Browse events shaped around this interest.'}
        </Text>
      </View>
      <Text style={[styles.meta, { color: theme.colors.primary }]}>
        {formatCountLabel(category.interestedUsersCount ?? 0, 'interest')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    minHeight: 150,
    padding: 16,
    width: '48.4%',
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: 17,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  meta: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  title: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
});
