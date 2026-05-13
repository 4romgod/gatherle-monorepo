import { StyleSheet, Text, View } from 'react-native';
import type { MobileChatMessage } from '@data/graphql/query/Chat/types';
import { formatThreadTime } from '@/lib/messages/thread';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

type ChatBubbleProps = {
  isOutgoing: boolean;
  message: MobileChatMessage;
};

export function ChatBubble({ isOutgoing, message }: ChatBubbleProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.row, isOutgoing ? styles.rowOutgoing : styles.rowIncoming]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOutgoing ? theme.colors.primary : theme.colors.surface,
            borderColor: isOutgoing ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.message, { color: isOutgoing ? theme.colors.primaryContrast : theme.colors.textPrimary }]}>
          {message.message}
        </Text>
      </View>
      <Text style={[styles.time, { color: theme.colors.textMuted }]}>{formatThreadTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 15,
    borderWidth: 1,
    maxWidth: '72%',
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  message: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    gap: 3,
  },
  rowIncoming: {
    alignItems: 'flex-start',
  },
  rowOutgoing: {
    alignItems: 'flex-end',
  },
  time: {
    ...typography.bodyMedium,
    fontSize: fontSize.xxs,
    paddingHorizontal: 2,
  },
});
