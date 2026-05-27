import { Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import type { MobileChatConversation } from '@data/graphql/query/Chat/types';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { ConversationRow } from '@/components/messages/ConversationRow';

type SwipeableConversationRowProps = {
  conversation: MobileChatConversation;
  onPress?: () => void;
  onToggleUnread?: () => void;
};

function ConversationRightActions({ isUnread, onToggleUnread }: { isUnread: boolean; onToggleUnread?: () => void }) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.actionsWrap}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggleUnread}
        style={[styles.actionButton, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}
      >
        <Feather
          color={isUnread ? theme.colors.primary : theme.colors.textPrimary}
          name={isUnread ? 'check' : 'mail'}
          size={16}
        />
      </Pressable>
    </View>
  );
}

export function SwipeableConversationRow({ conversation, onPress, onToggleUnread }: SwipeableConversationRowProps) {
  return (
    <Swipeable
      dragOffsetFromRightEdge={18}
      overshootRight={false}
      renderRightActions={() => (
        <ConversationRightActions isUnread={conversation.unreadCount > 0} onToggleUnread={onToggleUnread} />
      )}
    >
      <ConversationRow conversation={conversation} onPress={onPress} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
    width: 60,
  },
});
