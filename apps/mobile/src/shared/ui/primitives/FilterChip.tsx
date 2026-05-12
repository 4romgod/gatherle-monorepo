import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type FilterChipProps = {
  active?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'success';
};

export function FilterChip({ active, label, onPress, tone = 'primary' }: FilterChipProps) {
  const { theme } = useAppTheme();
  const accent = tone === 'success' ? theme.colors.success : theme.colors.primary;
  const soft = tone === 'success' ? theme.colors.successSoft : theme.colors.primarySoft;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: active ? soft : theme.colors.surface,
          borderColor: active ? accent : theme.colors.border,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: active ? accent : theme.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  filterChipText: {
    ...typography.bodySemiBold,
    fontSize: 15,
  },
});
