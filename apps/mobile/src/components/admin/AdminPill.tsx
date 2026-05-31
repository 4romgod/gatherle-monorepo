import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';

type AdminPillProps = {
  label: string;
  tone?: 'default' | 'error' | 'primary' | 'success';
};

export function AdminPill({ label, tone = 'default' }: AdminPillProps) {
  const { theme } = useAppTheme();

  const palette =
    tone === 'primary'
      ? { background: theme.colors.primarySoft, border: theme.colors.primary, text: theme.colors.primary }
      : tone === 'success'
        ? { background: theme.colors.successSoft, border: theme.colors.success, text: theme.colors.success }
        : tone === 'error'
          ? { background: theme.colors.errorSoft, border: theme.colors.error, text: theme.colors.error }
          : { background: theme.colors.surfaceMuted, border: theme.colors.border, text: theme.colors.textSecondary };

  return (
    <View style={[styles.pill, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  pill: {
    borderRadius: MOBILE_RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
