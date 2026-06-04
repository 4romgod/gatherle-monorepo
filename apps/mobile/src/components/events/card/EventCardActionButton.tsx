import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';

type EventCardActionButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ComponentProps<typeof Feather>['name'];
  loading?: boolean;
  onPress: (event: GestureResponderEvent) => void;
  tone?: 'primary' | 'success' | 'neutral';
};

export function EventCardActionButton({
  active = false,
  disabled = false,
  icon,
  loading = false,
  onPress,
  tone = 'neutral',
}: EventCardActionButtonProps) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'success'
      ? {
          activeBackground: theme.colors.successSoft,
          activeBorder: theme.colors.success,
          activeColor: theme.colors.success,
          activeShadowColor: theme.colors.success,
          color: theme.colors.textSecondary,
        }
      : tone === 'primary'
        ? {
            activeBackground: theme.colors.primarySoft,
            activeBorder: theme.colors.primary,
            activeColor: theme.colors.primary,
            activeShadowColor: theme.colors.primary,
            color: theme.colors.textSecondary,
          }
        : {
            activeBackground: theme.colors.surfaceMuted,
            activeBorder: theme.colors.border,
            activeColor: theme.colors.textPrimary,
            activeShadowColor: theme.colors.border,
            color: theme.colors.textSecondary,
          };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: active ? palette.activeBackground : 'transparent',
          borderColor: active ? palette.activeBorder : 'transparent',
          opacity: disabled || loading ? 0.45 : pressed ? 0.82 : 1,
          shadowColor: active ? palette.activeShadowColor : 'transparent',
          shadowOpacity: active ? 0.18 : 0,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={active ? palette.activeColor : palette.color} size="small" />
      ) : (
        <Feather color={active ? palette.activeColor : palette.color} name={icon} size={20} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.compact,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    shadowOffset: {
      height: 3,
      width: 0,
    },
    shadowRadius: 6,
    width: 32,
  },
});
