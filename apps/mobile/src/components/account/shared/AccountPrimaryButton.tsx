import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type AccountPrimaryButtonProps = {
  icon?: ComponentProps<typeof Feather>['name'];
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: 'danger' | 'primary' | 'secondary';
};

export function AccountPrimaryButton({
  icon,
  label,
  loading = false,
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
            background: theme.colors.errorSoft,
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
      <Text style={[styles.label, { color: palette.color }]}>{loading ? 'Saving...' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 18,
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
