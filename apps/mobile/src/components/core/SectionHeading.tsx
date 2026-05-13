import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type SectionHeadingProps = {
  actionLabel?: string;
  onPressAction?: () => void;
  title: string;
};

export function SectionHeading({ actionLabel, onPressAction, title }: SectionHeadingProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
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
    flex: 1,
    fontSize: fontSize.xl3,
    letterSpacing: -0.7,
  },
});
