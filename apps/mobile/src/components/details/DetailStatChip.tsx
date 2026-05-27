import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';

type DetailStatChipProps = {
  label: string;
  value: string;
};

export function DetailStatChip({ label, value }: DetailStatChipProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: MOBILE_RADIUS.card,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    ...typography.bodyMedium,
    fontSize: 12,
  },
  value: {
    ...typography.bodyBold,
    fontSize: 18,
    letterSpacing: -0.4,
  },
});
