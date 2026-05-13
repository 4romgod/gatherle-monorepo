import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type AuthStatusPanelProps = {
  actionLabel: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPressAction: () => void;
  title: string;
  tone?: 'error' | 'success';
};

export function AuthStatusPanel({
  actionLabel,
  description,
  icon,
  onPressAction,
  title,
  tone = 'success',
}: AuthStatusPanelProps) {
  const { theme } = useAppTheme();
  const toneColor = tone === 'error' ? theme.colors.error : theme.colors.success;
  const toneBackground = tone === 'error' ? theme.colors.errorSoft : theme.colors.successSoft;

  return (
    <View style={styles.panel}>
      <View style={[styles.iconWrap, { backgroundColor: toneBackground }]}>
        <Feather color={toneColor} name={icon} size={26} />
      </View>
      <View style={styles.copyBlock}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      </View>
      <Pressable
        onPress={onPressAction}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: theme.colors.secondary,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={[styles.actionLabel, { color: theme.colors.primaryContrast }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  actionLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
  copyBlock: {
    gap: 8,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  panel: {
    alignItems: 'center',
    gap: 18,
  },
  title: {
    ...typography.displayBold,
    fontSize: 24,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
});
