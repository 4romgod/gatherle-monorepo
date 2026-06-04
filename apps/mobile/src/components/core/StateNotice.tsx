import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';
import { InlineButton } from './InlineButton';

type StateNoticeProps = {
  actionLabel?: string;
  message: string;
  onPressAction?: () => void;
  title?: string;
};

export function StateNotice({ actionLabel, message, onPressAction, title }: StateNoticeProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.stateNotice,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
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
