'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Box, CircularProgress } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import { GetMomentByIdDocument } from '@/data/graphql/query';
import type { GetMomentByIdQuery } from '@/data/graphql/types/graphql';
import { useChatActions, useChatRealtime } from '@/hooks';
import { useAppContext } from '@/hooks/useAppContext';
import { STORAGE_KEYS } from '@/hooks/usePersistentState';
import { useConversationData } from '@/hooks/useConversationData';
import { useMarkConversationRead } from '@/hooks/useMarkConversationRead';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { useMessageScroll } from '@/hooks/useMessageScroll';
import EventMomentViewer from '@/components/eventMoments/EventMomentViewer';
import { ConversationSidebar } from '@/components/messages/ConversationSidebar';
import { MessageThread, MessageThreadError } from '@/components/messages/MessageThread';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { getAuthHeader } from '@/lib/utils/auth';
import { extractApolloErrorMessage } from '@/lib/utils/apollo-error';

interface ConversationThreadProps {
  username: string;
}

export default function ConversationThread({ username }: ConversationThreadProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { data: session } = useSession();
  const { setToastProps } = useAppContext();
  const token = session?.user?.token;

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
  const [replyMomentViewerOpen, setReplyMomentViewerOpen] = useState(false);
  const [replyMomentViewerItems, setReplyMomentViewerItems] = useState<
    NonNullable<GetMomentByIdQuery['readMomentById']>[]
  >([]);
  const [loadReplyMoment] = useLazyQuery(GetMomentByIdDocument, {
    fetchPolicy: 'network-only',
    context: { headers: getAuthHeader(token) },
  });

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

  // Persist the last open chat username
  useEffect(() => {
    if (typeof window !== 'undefined' && username) {
      window.localStorage.setItem(STORAGE_KEYS.LAST_OPEN_CHAT_USERNAME, username);
    }
  }, [username]);

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

  const handleOpenReplyMoment = useCallback(
    async (momentId: string) => {
      try {
        const { data } = await loadReplyMoment({ variables: { momentId } });
        const moment = data?.readMomentById;

        if (!moment) {
          setToastProps((previous) => ({
            ...previous,
            open: true,
            severity: 'error',
            message: 'This moment is no longer available.',
          }));
          return;
        }

        setReplyMomentViewerItems([moment]);
        setReplyMomentViewerOpen(true);
      } catch (error) {
        setToastProps((previous) => ({
          ...previous,
          open: true,
          severity: 'error',
          message: extractApolloErrorMessage(error, 'Unable to open this moment right now.'),
        }));
      }
    },
    [loadReplyMoment, setToastProps],
  );

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
            showJumpToLatest={showJumpToLatest}
            scrollToLatest={scrollToLatest}
            messageListRef={messageListRef}
            messagesBottomRef={messagesBottomRef}
            updateScrollStickiness={updateScrollStickiness}
            onOpenReplyMoment={handleOpenReplyMoment}
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
      <EventMomentViewer
        moments={replyMomentViewerItems}
        startIndex={0}
        open={replyMomentViewerOpen}
        onClose={() => setReplyMomentViewerOpen(false)}
      />
    </Box>
  );
}
