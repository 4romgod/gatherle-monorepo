import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';

type AccountPrimaryButtonProps = {
  icon?: ComponentProps<typeof Feather>['name'];
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  onPress: () => void;
  tone?: 'danger' | 'primary' | 'secondary';
};

export function AccountPrimaryButton({
  icon,
  label,
  loading = false,
  loadingLabel = 'Saving...',
  onPress,
  tone = 'primary',
}: AccountPrimaryButtonProps) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'secondary'
      ? {
          background: theme.colors.surfaceRaised,
          border: theme.colors.border,
          color: theme.colors.textPrimary,
        }
      : tone === 'danger'
        ? {
            background: theme.dark ? theme.colors.surfaceRaised : theme.colors.errorSoft,
            border: theme.colors.error,
            color: theme.colors.error,
          }
        : {
            background: theme.colors.primary,
            border: theme.colors.primary,
            color: theme.colors.primaryContrast,
          };

  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: pressed || loading ? 0.88 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} size="small" />
      ) : icon ? (
        <Feather color={palette.color} name={icon} size={16} />
      ) : null}
      <Text style={[styles.label, { color: palette.color }]}>{loading ? loadingLabel : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  label: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});
