import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';

type SmallActionButtonProps = {
  compact?: boolean;
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  tone?: 'ghost' | 'outline';
};

export function SmallActionButton({ compact = false, icon, label, onPress, tone = 'ghost' }: SmallActionButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={
        /* istanbul ignore next: visual pressed-state styling is owned by React Native. */
        ({ pressed }) => [
          styles.smallActionButton,
          compact ? styles.smallActionButtonCompact : null,
          {
            backgroundColor: tone === 'ghost' ? 'transparent' : theme.colors.surface,
            borderColor: tone === 'ghost' ? 'transparent' : theme.colors.primarySoft,
            opacity: pressed ? 0.8 : 1,
          },
        ]
      }
    >
      <Feather color={theme.colors.primary} name={icon} size={compact ? 16 : 18} />
      <Text
        style={[
          styles.smallActionButtonText,
          compact ? styles.smallActionButtonTextCompact : null,
          { color: theme.colors.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  smallActionButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  smallActionButtonCompact: {
    borderRadius: MOBILE_RADIUS.compact,
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  smallActionButtonText: {
    ...typography.bodySemiBold,
    fontSize: 16,
  },
  smallActionButtonTextCompact: {
    fontSize: 13,
  },
});
