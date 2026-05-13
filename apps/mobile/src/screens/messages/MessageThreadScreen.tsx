import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageHeading } from '@/components/core/PageHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { ChatBubble } from '@/components/messages/thread/ChatBubble';
import { ChatComposer } from '@/components/messages/thread/ChatComposer';
import { ChatDayDivider } from '@/components/messages/thread/ChatDayDivider';
import { ChatThreadHeader } from '@/components/messages/thread/ChatThreadHeader';
import { useChatRealtime } from '@/hooks/messages/useChatRealtime';
import { useChatThread } from '@/hooks/messages/useChatThread';
import { buildChatThreadItems } from '@/lib/messages/thread';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

type MessageThreadRoute = RouteProp<RootStackParamList, 'MessageThread'>;

export function MessageThreadScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const route = useRoute<MessageThreadRoute>();
  const { theme } = useAppTheme();
  const { authToken, isAuthenticated, userId } = useAppShell();
  const { avatarUrl, displayName, username, withUserId } = route.params;
  const scrollRef = useRef<ScrollView | null>(null);
  const { appendMessage, error, loading, messages, refetch } = useChatThread({
    authToken,
    enabled: isAuthenticated,
    withUserId,
  });
  const { isConnected, markConversationRead, sendChatMessage } = useChatRealtime({
    enabled: isAuthenticated && Boolean(withUserId),
    onChatMessage: (payload) => {
      if (!userId) {
        return;
      }

      const isIncomingMessage = payload.senderUserId === withUserId && payload.recipientUserId === userId;
      const isOutgoingMessage = payload.senderUserId === userId && payload.recipientUserId === withUserId;

      if (!isIncomingMessage && !isOutgoingMessage) {
        return;
      }

      appendMessage({
        __typename: 'ChatMessage',
        chatMessageId: payload.messageId,
        createdAt: payload.createdAt,
        isRead: payload.isRead,
        message: payload.message,
        readAt: null,
        recipientUserId: payload.recipientUserId,
        replyToMomentCaption: null,
        replyToMomentId: null,
        replyToMomentType: null,
        senderUserId: payload.senderUserId,
      });

      if (isIncomingMessage) {
        markConversationRead(withUserId);
      }
    },
  });

  const threadItems = useMemo(() => buildChatThreadItems(messages, withUserId), [messages, withUserId]);

  const handleSend = useCallback(
    (message: string) => {
      return sendChatMessage(withUserId, message);
    },
    [sendChatMessage, withUserId],
  );

  useEffect(() => {
    if (threadItems.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [threadItems.length]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.authPromptWrap} showsVerticalScrollIndicator={false}>
          <PageHeading subtitle="Log in to read and reply in your direct conversations." title="Conversation" />
          <AuthPromptCard
            description="Your direct chat history is only available once your session is active."
            onPressPrimary={() => navigation.navigate('Login', { redirectTab: 'Messages' })}
            onPressSecondary={() => navigation.navigate('Register', { redirectTab: 'Messages' })}
            primaryLabel="Login from the inbox"
            secondaryLabel="Create account"
            title="Conversation access needs a signed-in account"
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.inner}>
        <ChatThreadHeader avatarUrl={avatarUrl} displayName={displayName} username={username} />

        {loading && threadItems.length === 0 ? (
          <View style={styles.stateWrap}>
            <StateNotice message="Loading your conversation..." />
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <StateNotice
              actionLabel="Retry"
              message="We couldn’t load this conversation."
              onPressAction={() => void refetch()}
            />
          </View>
        ) : threadItems.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.threadContent}
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            style={styles.threadScroll}
          >
            {threadItems.map((item) =>
              item.kind === 'day' ? (
                <ChatDayDivider key={item.key} label={item.label} />
              ) : (
                <ChatBubble isOutgoing={item.isOutgoing} key={item.key} message={item.message} />
              ),
            )}
          </ScrollView>
        ) : (
          <View style={styles.stateWrap}>
            <StateNotice message="No messages have landed in this conversation yet." />
          </View>
        )}

        <ChatComposer isConnected={isConnected} onSend={handleSend} targetUserId={withUserId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authPromptWrap: {
    gap: 24,
    paddingBottom: 64,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inner: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  screen: {
    flex: 1,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  threadContent: {
    gap: 10,
    paddingBottom: 14,
  },
  threadScroll: {
    flex: 1,
  },
});
