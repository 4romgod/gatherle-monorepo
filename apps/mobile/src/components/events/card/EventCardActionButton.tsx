import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type EventCardActionButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ComponentProps<typeof Feather>['name'];
  onPress: (event: GestureResponderEvent) => void;
  tone?: 'primary' | 'success' | 'neutral';
};

export function EventCardActionButton({
  active = false,
  disabled = false,
  icon,
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
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: active ? palette.activeBackground : 'transparent',
          borderColor: active ? palette.activeBorder : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          shadowColor: active ? palette.activeShadowColor : 'transparent',
          shadowOpacity: active ? 0.18 : 0,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <Feather color={active ? palette.activeColor : palette.color} name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 10,
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
