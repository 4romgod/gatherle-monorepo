import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type FilterActionButtonProps = {
  activeCount: number;
  onPress: () => void;
};

export function FilterActionButton({ activeCount, onPress }: FilterActionButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterActionButton,
        {
          backgroundColor: theme.colors.primarySoft,
          borderColor: theme.colors.primary,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {activeCount > 0 ? (
        <View style={[styles.filterActionBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.filterActionBadgeText, { color: theme.colors.primaryContrast }]}>{activeCount}</Text>
        </View>
      ) : null}
      <View style={styles.filterActionContent}>
        <Feather color={theme.colors.textPrimary} name="sliders" size={18} />
        <Text style={[styles.filterActionText, { color: theme.colors.textPrimary }]}>Filters</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterActionBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    minWidth: 24,
    position: 'absolute',
    right: -8,
    top: -10,
  },
  filterActionBadgeText: {
    ...typography.bodyBold,
    fontSize: 12,
  },
  filterActionButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 18,
    position: 'relative',
  },
  filterActionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  filterActionText: {
    ...typography.bodyBold,
    fontSize: 17,
  },
});
