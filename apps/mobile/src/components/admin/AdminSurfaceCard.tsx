import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';

type AdminSurfaceCardProps = PropsWithChildren<{
  tone?: 'default' | 'muted';
}>;

export function AdminSurfaceCard({ children, tone = 'default' }: AdminSurfaceCardProps) {
  const { theme } = useAppTheme();

  const backgroundColor =
    tone === 'muted'
      ? theme.dark
        ? 'rgba(122, 115, 255, 0.12)'
        : theme.colors.surfaceMuted
      : theme.colors.surfaceRaised;

  const borderColor = theme.dark
    ? tone === 'muted'
      ? 'rgba(122, 115, 255, 0.32)'
      : 'rgba(255, 255, 255, 0.10)'
    : theme.colors.border;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
          borderWidth: 2,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
});
