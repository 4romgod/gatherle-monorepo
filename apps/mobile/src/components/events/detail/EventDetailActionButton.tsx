import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';

type EventDetailActionButtonProps = {
  compact?: boolean;
  disabled?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'primarySoft' | 'successSoft';
};

export function EventDetailActionButton({
  compact = false,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  tone = 'primary',
}: EventDetailActionButtonProps) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'primary'
      ? {
          backgroundColor: theme.colors.secondary,
          borderColor: theme.colors.secondary,
          textColor: theme.colors.primaryContrast,
        }
      : tone === 'primarySoft'
        ? {
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.primary,
            textColor: theme.colors.primary,
          }
        : tone === 'successSoft'
          ? {
              backgroundColor: theme.colors.successSoft,
              borderColor: theme.colors.success,
              textColor: theme.colors.success,
            }
          : {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              textColor: theme.colors.textPrimary,
            };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        compact ? styles.actionButtonCompact : null,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} size="small" />
      ) : (
        <Feather color={palette.textColor} name={icon} size={compact ? 16 : 18} />
      )}
      <Text
        style={[styles.actionButtonText, compact ? styles.actionButtonTextCompact : null, { color: palette.textColor }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionButtonCompact: {
    borderRadius: MOBILE_RADIUS.compact,
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  actionButtonText: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  actionButtonTextCompact: {
    fontSize: 12,
  },
});
