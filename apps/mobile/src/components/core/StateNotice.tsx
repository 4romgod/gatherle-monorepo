import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';
import { InlineButton } from './InlineButton';

type StateNoticeProps = {
  actionLabel?: string;
  message: string;
  onPressAction?: () => void;
};

export function StateNotice({ actionLabel, message, onPressAction }: StateNoticeProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[styles.stateNotice, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
    >
      <Text style={[styles.stateNoticeText, { color: theme.colors.textSecondary }]}>{message}</Text>
      {actionLabel && onPressAction ? (
        <InlineButton label={actionLabel} onPress={onPressAction} tone="neutral" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stateNotice: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  stateNoticeText: {
    ...typography.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
});
