import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EventMomentType } from '@data/graphql/types/graphql';
import type { MobileChatMessage } from '@data/graphql/query/Chat/types';
import { formatThreadTime } from '@/lib/messages/thread';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type ChatBubbleProps = {
  isOutgoing: boolean;
  message: MobileChatMessage;
  onPressReplyMoment?: (momentId: string) => void;
};

export function ChatBubble({ isOutgoing, message, onPressReplyMoment }: ChatBubbleProps) {
  const { theme } = useAppTheme();
  const replyTone = isOutgoing ? 'rgba(255,255,255,0.72)' : theme.colors.primary;
  const replyTextColor = isOutgoing ? 'rgba(255,255,255,0.88)' : theme.colors.textSecondary;
  const replyMetaColor = isOutgoing ? 'rgba(255,255,255,0.74)' : theme.colors.textMuted;
  const replyMomentId = message.replyToMomentId ?? null;

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
        {replyMomentId ? (
          <Pressable
            onPress={() => onPressReplyMoment?.(replyMomentId)}
            style={({ pressed }) => [
              styles.replyCard,
              {
                backgroundColor: isOutgoing ? 'rgba(255,255,255,0.08)' : theme.colors.surfaceRaised,
                borderLeftColor: replyTone,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.replyLabel, { color: replyTextColor }]}>Replied to a moment</Text>
            {message.replyToMomentCaption ? (
              <Text numberOfLines={1} style={[styles.replyPreview, { color: replyMetaColor }]}>
                {message.replyToMomentCaption}
              </Text>
            ) : message.replyToMomentType ? (
              <Text style={[styles.replyPreview, { color: replyMetaColor }]}>
                {message.replyToMomentType === EventMomentType.Image
                  ? 'Photo'
                  : message.replyToMomentType === EventMomentType.Video
                    ? 'Video'
                    : 'Text moment'}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
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
  replyCard: {
    borderBottomRightRadius: 8,
    borderTopRightRadius: 8,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 7,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 2,
  },
  replyLabel: {
    ...typography.bodyBold,
    fontSize: 10,
    lineHeight: 13,
  },
  replyPreview: {
    ...typography.bodyRegular,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
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
