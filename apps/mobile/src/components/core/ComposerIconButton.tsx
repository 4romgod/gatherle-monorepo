import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

type ComposerIconButtonProps = {
  accessibilityLabel: string;
  buttonSize?: number;
  disabled?: boolean;
  filled?: boolean;
  icon: FeatherIconName;
  iconRotationDeg?: number;
  onPress: () => void;
  size?: number;
};

export function ComposerIconButton({
  accessibilityLabel,
  buttonSize = 32,
  disabled = false,
  filled = false,
  icon,
  iconRotationDeg = 0,
  onPress,
  size = 17,
}: ComposerIconButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: filled ? (disabled ? theme.colors.surfaceRaised : theme.colors.primary) : 'transparent',
          borderColor: filled ? 'transparent' : theme.colors.border,
          height: buttonSize,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
          width: buttonSize,
        },
      ]}
    >
      <View style={iconRotationDeg ? { transform: [{ rotate: `${iconRotationDeg}deg` }] } : undefined}>
        <Feather color={filled ? theme.colors.primaryContrast : theme.colors.textSecondary} name={icon} size={size} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
