import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

export type ProfileEventsEmptyStateConfig = {
  ctaLabel?: string;
  description: string;
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
};

type ProfileEventsEmptyStateProps = ProfileEventsEmptyStateConfig & {
  onPressCta?: () => void;
};

export function ProfileEventsEmptyState({
  ctaLabel,
  description,
  icon,
  onPressCta,
  title,
}: ProfileEventsEmptyStateProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Feather color={theme.colors.textSecondary} name={icon} size={42} />
      </View>

      <View style={styles.copyBlock}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
      </View>

      {ctaLabel && onPressCta ? (
        <Pressable
          onPress={onPressCta}
          style={({ pressed }) => [
            styles.ctaButton,
            {
              backgroundColor: theme.colors.secondary,
              borderColor: theme.colors.secondary,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaLabel, { color: theme.colors.secondaryContrast }]}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 10,
    maxWidth: 320,
  },
  ctaButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  ctaLabel: {
    ...typography.bodyBold,
    fontSize: 12,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 56,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  title: {
    ...typography.displayBold,
    fontSize: 18,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});
