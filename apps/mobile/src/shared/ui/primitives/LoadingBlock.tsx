import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type LoadingBlockProps = {
  label: string;
};

export function LoadingBlock({ label }: LoadingBlockProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  loadingText: {
    ...typography.bodyMedium,
    fontSize: 15,
  },
});
