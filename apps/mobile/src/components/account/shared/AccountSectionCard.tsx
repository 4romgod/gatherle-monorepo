import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type AccountSectionCardProps = {
  children: ReactNode;
  description?: string;
  title: string;
};

export function AccountSectionCard({ children, description, title }: AccountSectionCardProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 19,
  },
  header: {
    gap: 6,
  },
  section: {
    gap: 18,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
});
