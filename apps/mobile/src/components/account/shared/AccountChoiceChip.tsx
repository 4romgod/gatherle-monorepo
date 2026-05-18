import { Pressable, StyleSheet, Text } from 'react-native';
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
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
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
    minHeight: 38,
    paddingHorizontal: 14,
  },
  label: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
});
