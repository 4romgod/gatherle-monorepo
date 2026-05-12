import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export function ThemeModeButton() {
  const { isDark, theme, toggleMode } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      accessibilityRole="button"
      onPress={toggleMode}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Feather name={isDark ? 'sun' : 'moon'} size={18} color={theme.colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
