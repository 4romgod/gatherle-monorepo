import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { EventMomentType } from '@data/graphql/types/graphql';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import type { RootStackParamList } from '@/app/navigation/routes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { StateNotice } from '@/components/core/StateNotice';
import { ChatBubble } from '@/components/messages/thread/ChatBubble';
import { ChatComposer } from '@/components/messages/thread/ChatComposer';
import { ChatDayDivider } from '@/components/messages/thread/ChatDayDivider';
import { ChatThreadHeader } from '@/components/messages/thread/ChatThreadHeader';
import { ChatThreadSkeleton } from '@/components/skeleton/ChatThreadSkeleton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useChatRealtime } from '@/hooks/messages/useChatRealtime';
import { useChatThread } from '@/hooks/messages/useChatThread';
import { buildChatThreadItems } from '@/lib/messages/thread';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

type MessageThreadRoute = RouteProp<RootStackParamList, 'MessageThread'>;

function normalizeReplyMomentType(value: string | null | undefined): EventMomentType | null {
  switch (value?.toLowerCase()) {
    case 'image':
      return EventMomentType.Image;
    case 'video':
      return EventMomentType.Video;
    case 'text':
      return EventMomentType.Text;
    default:
      return null;
  }
}

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
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );
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
        replyToMomentCaption: payload.replyToMomentCaption ?? null,
        replyToMomentId: payload.replyToMomentId ?? null,
        replyToMomentType: normalizeReplyMomentType(payload.replyToMomentType),
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
        <ScrollView
          alwaysBounceVertical
          bounces
          contentContainerStyle={styles.authPromptWrap}
          overScrollMode="always"
          showsVerticalScrollIndicator={false}
        >
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
        <ChatThreadHeader
          avatarUrl={avatarUrl}
          displayName={displayName}
          onPress={() =>
            navigation.navigate('UserProfile', {
              avatarUrl,
              displayName,
              userId: withUserId,
              username,
            })
          }
          username={username}
        />

        {loading && threadItems.length === 0 ? (
          <View style={styles.stateWrap}>
            <ChatThreadSkeleton />
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
            alwaysBounceVertical
            bounces
            contentContainerStyle={styles.threadContent}
            overScrollMode="always"
            ref={scrollRef}
            refreshControl={
              <RefreshControl
                colors={[theme.colors.primary]}
                onRefresh={onRefresh}
                progressBackgroundColor={theme.colors.surfaceRaised}
                refreshing={refreshing}
                tintColor={theme.colors.primary}
              />
            }
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
