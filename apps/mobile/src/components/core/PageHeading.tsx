import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type PageHeadingProps = {
  subtitle?: string;
  title: string;
};

export function PageHeading({ title, subtitle }: PageHeadingProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.pageHeading}>
      <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeading: {
    gap: 8,
  },
  pageSubtitle: {
    ...typography.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  pageTitle: {
    ...typography.displayBold,
    fontSize: 22,
    letterSpacing: -0.9,
  },
});
