import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type AuthPromptCardProps = {
  description: string;
  onPressPrimary: () => void;
  onPressSecondary: () => void;
  primaryLabel: string;
  secondaryLabel: string;
  title: string;
};

export function AuthPromptCard({
  description,
  onPressPrimary,
  onPressSecondary,
  primaryLabel,
  secondaryLabel,
  title,
}: AuthPromptCardProps) {
  const { theme } = useAppTheme();
  const shadowStyle =
    theme.mode === 'light'
      ? {
          elevation: 3,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }
      : null;

  return (
    <View
      style={[
        styles.card,
        shadowStyle,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.copyBlock}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onPressPrimary}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.colors.secondary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.primaryContrast }]}>{primaryLabel}</Text>
        </Pressable>
        <Pressable
          onPress={onPressSecondary}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderColor: theme.colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>{secondaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 20,
    padding: 20,
  },
  copyBlock: {
    gap: 8,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    fontSize: 17,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  title: {
    ...typography.displayBold,
    fontSize: 24,
    letterSpacing: -0.6,
  },
});
