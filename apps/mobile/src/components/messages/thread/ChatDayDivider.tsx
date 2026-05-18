import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type ChatDayDividerProps = {
  label: string;
};

export function ChatDayDivider({ label }: ChatDayDividerProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.bodyMedium,
    fontSize: fontSize.xs,
  },
  rule: {
    flex: 1,
    height: 1,
  },
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
});
