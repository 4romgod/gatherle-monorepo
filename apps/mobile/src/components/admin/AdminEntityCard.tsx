import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { AdminSurfaceCard } from './AdminSurfaceCard';

type AdminEntityCardProps = PropsWithChildren<{
  actions?: ReactNode;
  description?: string | null;
  meta?: ReactNode;
  subtitle?: string | null;
  title: string;
}>;

export function AdminEntityCard({ actions, children, description, meta, subtitle, title }: AdminEntityCardProps) {
  const { theme } = useAppTheme();

  return (
    <AdminSurfaceCard>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text> : null}
          {meta ? <View style={styles.meta}>{meta}</View> : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {description ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      ) : null}
      {children}
    </AdminSurfaceCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  description: {
    ...typography.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  header: {
    gap: 12,
  },
  headerCopy: {
    gap: 4,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  subtitle: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
});
