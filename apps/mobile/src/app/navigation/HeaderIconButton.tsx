import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';

type HeaderIconButtonProps = {
  accessibilityLabel: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  size?: number;
  tintColor?: string;
};

export function HeaderIconButton({ accessibilityLabel, icon, onPress, size = 22, tintColor }: HeaderIconButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.64 : 1 }]}
    >
      <Feather color={tintColor ?? theme.colors.primary} name={icon} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 40,
  },
});
