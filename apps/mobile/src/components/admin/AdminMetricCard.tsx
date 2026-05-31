import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';

type AdminMetricCardProps = {
  helper?: string;
  label: string;
  tone?: 'default' | 'accent';
  value: string | number;
};

export function AdminMetricCard({ helper, label, tone = 'default', value }: AdminMetricCardProps) {
  const { theme } = useAppTheme();
  const isAccent = tone === 'accent';

  const backgroundColor = isAccent
    ? theme.dark
      ? 'rgba(122, 115, 255, 0.18)'
      : theme.colors.primarySoft
    : theme.dark
      ? theme.colors.surfaceMuted
      : theme.colors.surface;

  const borderColor = isAccent
    ? theme.dark
      ? 'rgba(122, 115, 255, 0.45)'
      : theme.colors.primary
    : theme.dark
      ? 'rgba(255, 255, 255, 0.10)'
      : theme.colors.border;

  const labelColor = isAccent ? (theme.dark ? '#c7c4ff' : theme.colors.primary) : theme.colors.textSecondary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Text style={[styles.label, { color: labelColor }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
      {helper ? <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  helper: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
  },
  label: {
    ...typography.bodyBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.8,
  },
  value: {
    ...typography.displayBold,
    fontSize: 26,
    lineHeight: 30,
  },
});
