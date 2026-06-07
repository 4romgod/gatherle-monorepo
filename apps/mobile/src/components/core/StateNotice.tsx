import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';
import { InlineButton } from './InlineButton';

type StateNoticeProps = {
  actionLabel?: string;
  message: string;
  onPressAction?: () => void;
  tone?: 'default' | 'error' | 'info';
  title?: string;
};

export function StateNotice({ actionLabel, message, onPressAction, title, tone = 'default' }: StateNoticeProps) {
  const { theme } = useAppTheme();
  const surfaceColors =
    tone === 'error'
      ? {
          backgroundColor: theme.colors.errorSoft,
          borderColor: theme.colors.error,
          borderWidth: 1,
        }
      : tone === 'info'
        ? {
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.primary,
            borderWidth: 1,
          }
        : {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: 'transparent',
            borderWidth: 0,
          };

  return (
    <View
      style={[
        styles.stateNotice,
        {
          backgroundColor: surfaceColors.backgroundColor,
          borderColor: surfaceColors.borderColor,
          borderWidth: surfaceColors.borderWidth,
        },
      ]}
    >
      {title ? <Text style={[styles.stateNoticeTitle, { color: theme.colors.textPrimary }]}>{title}</Text> : null}
      <Text style={[styles.stateNoticeText, { color: theme.colors.textSecondary }]}>{message}</Text>
      {actionLabel && onPressAction ? (
        <InlineButton label={actionLabel} onPress={onPressAction} tone="neutral" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stateNotice: {
    borderWidth: 1,
    borderRadius: MOBILE_RADIUS.panel,
    gap: 16,
    padding: 20,
  },
  stateNoticeText: {
    ...typography.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  stateNoticeTitle: {
    ...typography.displayBold,
    fontSize: 18,
    letterSpacing: -0.4,
  },
});
