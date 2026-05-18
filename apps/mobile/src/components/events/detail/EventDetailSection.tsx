import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type EventDetailSectionProps = {
  children: ReactNode;
  title: string;
};

export function EventDetailSection({ title, children }: EventDetailSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionBody: {
    gap: 12,
  },
  sectionTitle: {
    ...typography.displayBold,
    fontSize: fontSize.xl2,
    letterSpacing: -0.6,
  },
});
