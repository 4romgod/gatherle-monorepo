import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type SectionHeadingProps = {
  actionLabel?: string;
  eyebrow?: string;
  onPressAction?: () => void;
  subtitle?: string;
  title: string;
};

export function SectionHeading({ actionLabel, eyebrow, onPressAction, subtitle, title }: SectionHeadingProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.sectionHeading}>
      <View style={styles.copyBlock}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>{eyebrow}</Text> : null}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onPressAction ? (
        <Pressable
          onPress={onPressAction}
          style={({ pressed }) => [styles.sectionAction, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.sectionActionText, { color: theme.colors.secondary }]}>{actionLabel}</Text>
          <Feather color={theme.colors.secondary} name="arrow-right" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copyBlock: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  eyebrow: {
    ...typography.bodyBold,
    fontSize: fontSize.xxs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionActionText: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.displayBold,
    fontSize: fontSize.xl2,
    letterSpacing: -0.7,
  },
  subtitle: {
    ...typography.bodyRegular,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
