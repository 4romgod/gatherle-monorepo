import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type AccountChoiceChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function AccountChoiceChip({ label, onPress, selected }: AccountChoiceChipProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={
        /* istanbul ignore next: visual pressed-state styling is owned by React Native. */
        ({ pressed }) => [
          styles.chip,
          {
            backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceMuted,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]
      }
    >
      <Text style={[styles.label, { color: selected ? theme.colors.primary : theme.colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: Platform.OS === 'android' ? 32 : 34,
    paddingHorizontal: Platform.OS === 'android' ? 11 : 12,
    paddingVertical: Platform.OS === 'android' ? 6 : 7,
  },
  label: {
    ...typography.bodySemiBold,
    fontSize: Platform.OS === 'android' ? fontSize.md : fontSize.base,
    includeFontPadding: false,
    lineHeight: Platform.OS === 'android' ? 14 : 16,
  },
});
