import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { typography } from '@/app/theme/typography';
import { InlineButton } from './InlineButton';

type StateNoticeProps = {
  actionLabel?: string;
  message: string;
  onPressAction?: () => void;
};

export function StateNotice({ actionLabel, message, onPressAction }: StateNoticeProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.stateNotice]}>
      <Text style={[styles.stateNoticeText, { color: theme.colors.textSecondary }]}>{message}</Text>
      {actionLabel && onPressAction ? (
        <InlineButton label={actionLabel} onPress={onPressAction} tone="neutral" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stateNotice: {
    borderRadius: MOBILE_RADIUS.panel,
    gap: 16,
    padding: 20,
  },
  stateNoticeText: {
    ...typography.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
});
