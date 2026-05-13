import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type InlineButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'neutral';
};

export function InlineButton({ label, onPress, tone = 'primary' }: InlineButtonProps) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'primary'
      ? { background: theme.colors.primary, color: theme.colors.primaryContrast, border: theme.colors.primary }
      : tone === 'secondary'
        ? { background: theme.colors.secondarySoft, color: theme.colors.secondary, border: theme.colors.secondarySoft }
        : { background: theme.colors.surfaceMuted, color: theme.colors.textPrimary, border: theme.colors.border };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.inlineButton,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text style={[styles.inlineButtonText, { color: palette.color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inlineButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  inlineButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});
