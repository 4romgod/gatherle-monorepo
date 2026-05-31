import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type AdminListFooterProps = {
  hasMore: boolean;
  label: string;
  loadedCount: number;
  loadingMore?: boolean;
};

export function AdminListFooter({ hasMore, label, loadedCount, loadingMore = false }: AdminListFooterProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>
        {loadedCount} {label}
        {loadedCount === 1 ? '' : 's'} loaded
      </Text>
      {loadingMore ? (
        <ActivityIndicator color={theme.colors.primary} size="small" />
      ) : !hasMore ? (
        <Text style={[styles.caption, { color: theme.colors.textMuted }]}>
          You&apos;ve reached the end of this list.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
});
