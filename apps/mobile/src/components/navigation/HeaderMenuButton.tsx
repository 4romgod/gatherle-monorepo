import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export function HeaderMenuButton() {
  const { openDrawer } = useAppShell();
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel="Open navigation menu"
      accessibilityRole="button"
      onPress={openDrawer}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <Feather color={theme.colors.primary} name="menu" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
