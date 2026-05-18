import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type AccountStatusBannerProps = {
  message: string;
  tone: 'error' | 'success';
};

export function AccountStatusBanner({ message, tone }: AccountStatusBannerProps) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'success'
      ? {
          background: theme.colors.successSoft,
          border: theme.colors.success,
          text: theme.colors.textPrimary,
        }
      : {
          background: theme.colors.errorSoft,
          border: theme.colors.error,
          text: theme.colors.textPrimary,
        };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  message: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
    lineHeight: 19,
  },
});
