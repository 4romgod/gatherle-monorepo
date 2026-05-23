import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type FilterActionButtonProps = {
  activeCount: number;
  onPress: () => void;
};

export function FilterActionButton({ activeCount, onPress }: FilterActionButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={
        /* istanbul ignore next: visual pressed-state styling is owned by React Native. */
        ({ pressed }) => [
          styles.filterActionButton,
          {
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.primary,
            opacity: pressed ? 0.86 : 1,
          },
        ]
      }
    >
      {activeCount > 0 ? (
        <View style={[styles.filterActionBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.filterActionBadgeText, { color: theme.colors.primaryContrast }]}>{activeCount}</Text>
        </View>
      ) : null}
      <View style={styles.filterActionContent}>
        <Feather color={theme.colors.textPrimary} name="sliders" size={15} />
        <Text style={[styles.filterActionText, { color: theme.colors.textPrimary }]}>Filters</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterActionBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    position: 'absolute',
    right: -6,
    top: -8,
  },
  filterActionBadgeText: {
    ...typography.bodyBold,
    fontSize: 11,
  },
  filterActionButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 38,
    paddingHorizontal: 14,
    position: 'relative',
  },
  filterActionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 38,
  },
  filterActionText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
});
