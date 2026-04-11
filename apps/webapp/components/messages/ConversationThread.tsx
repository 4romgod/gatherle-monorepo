'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useChatActions, useChatRealtime } from '@/hooks';
import { STORAGE_KEYS } from '@/hooks/usePersistentState';
import { useConversationData } from '@/hooks/useConversationData';
import { useMarkConversationRead } from '@/hooks/useMarkConversationRead';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { useMessageScroll } from '@/hooks/useMessageScroll';
import { ConversationSidebar } from '@/components/messages/ConversationSidebar';
import { MessageThread, MessageThreadError } from '@/components/messages/MessageThread';
import { MessageComposer } from '@/components/messages/MessageComposer';

interface ConversationThreadProps {
  username: string;
}

export default function ConversationThread({ username }: ConversationThreadProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // ── Data ───────────────────────────────────────────────────────────────────

  const {
    currentUserId,
    targetUser,
    targetUserId,
    targetUserLoading,
    targetUserError,
    conversations,
    conversationsLoading,
    conversationsError,
    resolvedUsersByConversationId,
    messages,
    messagesLoading,
    messagesError,
    displayIdentity,
  } = useConversationData(username);

  const { addPendingMessage, threadItems } = useThreadMessages({ messages, currentUserId });
  const { messageListRef, messagesBottomRef, showJumpToLatest, updateScrollStickiness, scrollToLatest } =
    useMessageScroll({ targetUserId, messagesLength: messages.length });

  // ── Realtime + mark-read ───────────────────────────────────────────────────

  const { markConversationRead: markConversationReadMutation } = useChatActions();

  // Bridge ref: useChatRealtime's onChatMessage needs scheduleMarkConversationRead,
  // which is returned by useMarkConversationRead (called below). WebSocket events
  // are always async so the ref is populated before any message can fire.
  const scheduleMarkConversationReadRef = useRef<() => void>(() => {});

  const {
    isConnected,
    sendChatMessage,
    markConversationRead: markConversationReadRealtime,
  } = useChatRealtime({
    enabled: Boolean(currentUserId),
    onChatMessage: (payload) => {
      if (!targetUserId || !currentUserId) return;
      const isIncoming = payload.senderUserId === targetUserId && payload.recipientUserId === currentUserId;
      if (isIncoming) scheduleMarkConversationReadRef.current();
    },
  });

  const scheduleMarkConversationRead = useMarkConversationRead({
    targetUserId,
    currentUserId,
    markConversationReadMutation,
    markConversationReadRealtime,
  });

  useEffect(() => {
    scheduleMarkConversationReadRef.current = scheduleMarkConversationRead;
  }, [scheduleMarkConversationRead]);

  // ── Side effects ───────────────────────────────────────────────────────────

  // Persist the last open chat username
  useEffect(() => {
    if (typeof window !== 'undefined' && username) {
      window.localStorage.setItem(STORAGE_KEYS.LAST_OPEN_CHAT_USERNAME, username);
    }
  }, [username]);

  // ── Send handler ───────────────────────────────────────────────────────────

  const handleSend = useCallback(
    (message: string): boolean => {
      if (!targetUserId) return false;
      const sent = sendChatMessage(targetUserId, message);
      if (!sent) return false;
      addPendingMessage({ recipientUserId: targetUserId, message });
      return true;
    },
    [addPendingMessage, sendChatMessage, targetUserId],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const threadPane = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        p: 2,
        pb: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      {targetUserLoading && !targetUser ? (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : targetUserError || !targetUser ? (
        <MessageThreadError username={username} />
      ) : (
        <>
          <MessageThread
            threadItems={threadItems}
            messagesLoading={messagesLoading}
            messagesError={messagesError}
            targetUser={targetUser}
            displayIdentity={displayIdentity}
            username={username}
            isDesktop={isDesktop}
            showJumpToLatest={showJumpToLatest}
            scrollToLatest={scrollToLatest}
            messageListRef={messageListRef}
            messagesBottomRef={messagesBottomRef}
            updateScrollStickiness={updateScrollStickiness}
          />
          <MessageComposer onSend={handleSend} isConnected={isConnected} targetUserId={targetUserId} />
        </>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
      }}
    >
      {isDesktop && (
        <ConversationSidebar
          conversations={conversations}
          conversationsLoading={conversationsLoading}
          conversationsError={conversationsError}
          currentUserId={currentUserId}
          username={username}
          resolvedUsersByConversationId={resolvedUsersByConversationId}
        />
      )}
      {threadPane}
    </Box>
  );
}
