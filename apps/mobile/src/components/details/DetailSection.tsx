import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type DetailSectionProps = {
  children: ReactNode;
  title: string;
};

export function DetailSection({ children, title }: DetailSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 17,
    letterSpacing: -0.3,
  },
});
