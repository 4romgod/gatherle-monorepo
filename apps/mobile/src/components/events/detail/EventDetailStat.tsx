import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type EventDetailStatProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  value: string;
};

export function EventDetailStat({ icon, label, onPress, value }: EventDetailStatProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.detailStatCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: onPress && pressed ? 0.84 : 1,
        },
      ]}
    >
      <Feather color={theme.colors.primary} name={icon} size={18} />
      <Text style={[styles.detailStatLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailStatValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  detailStatCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '48%',
    gap: 8,
    minHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  detailStatLabel: {
    ...typography.bodyMedium,
    fontSize: 12,
  },
  detailStatValue: {
    ...typography.bodySemiBold,
    fontSize: 12,
    lineHeight: 18,
  },
});
