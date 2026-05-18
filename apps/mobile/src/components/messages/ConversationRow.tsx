import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileChatConversation } from '@data/graphql/query/Chat/types';
import { formatRelativeTime, getDisplayName, getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';

type ConversationRowProps = {
  conversation: MobileChatConversation;
  onPress?: () => void;
};

export function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  const { theme } = useAppTheme();
  const user = conversation.conversationWithUser;
  const displayName = getDisplayName(user);
  const handle = user?.username ? `@${user.username}` : displayName;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      {user?.profile_picture ? (
        <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
          <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>{getInitials(displayName)}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>
            {handle}
          </Text>
          <View style={styles.metaRow}>
            {conversation.unreadCount > 0 ? (
              <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
            ) : null}
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatRelativeTime(conversation.updatedAt)}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.preview, { color: theme.colors.textSecondary }]}>
          {conversation.lastMessage.message}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: 40,
    width: 40,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarFallbackText: {
    ...typography.displayBold,
    fontSize: 13,
  },
  content: {
    flex: 1,
    gap: 2,
    minHeight: 40,
    justifyContent: 'center',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  preview: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  time: {
    ...typography.bodyMedium,
    fontSize: 12,
  },
  title: {
    ...typography.bodyBold,
    flex: 1,
    fontSize: 13,
  },
  unreadDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
});
