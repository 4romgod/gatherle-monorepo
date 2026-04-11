'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { logger } from '@/lib/utils';

interface UseMarkConversationReadProps {
  targetUserId: string | null | undefined;
  currentUserId: string | null;
  markConversationReadMutation: (withUserId: string) => Promise<unknown>;
  markConversationReadRealtime: (withUserId: string) => void;
}

/**
 * Encapsulates all "mark conversation as read" scheduling logic:
 * - Debounces the read mutation by 150ms
 * - Fires when the conversation first opens
 * - Re-fires when the tab becomes visible again
 * - Cleans up the pending timer on unmount
 */
export function useMarkConversationRead({
  targetUserId,
  currentUserId,
  markConversationReadMutation,
  markConversationReadRealtime,
}: UseMarkConversationReadProps): () => void {
  const client = useApolloClient();
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markConversationReadRef = useRef<((withUserId: string) => Promise<void>) | null>(null);

  // Keep the combined read handler up to date with the latest dependencies.
  // Uses a ref so scheduleMarkConversationRead stays stable.
  useEffect(() => {
    markConversationReadRef.current = async (withUserId: string) => {
      markConversationReadRealtime(withUserId);
      try {
        await markConversationReadMutation(withUserId);
      } catch (error) {
        logger.warn('Failed to mark conversation read through GraphQL mutation', { withUserId, error });
      } finally {
        void client.refetchQueries({
          include: ['ReadChatConversations', 'ReadChatMessages', 'GetUnreadChatCount'],
        });
      }
    };
  }, [client, markConversationReadMutation, markConversationReadRealtime]);

  const scheduleMarkConversationRead = useCallback(() => {
    if (!targetUserId || !currentUserId) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (markReadTimeoutRef.current) return;

    markReadTimeoutRef.current = setTimeout(() => {
      markReadTimeoutRef.current = null;
      void markConversationReadRef.current?.(targetUserId);
    }, 150);
  }, [currentUserId, targetUserId]);

  // Schedule read when the conversation first opens
  useEffect(() => {
    if (!targetUserId) return;
    scheduleMarkConversationRead();
  }, [scheduleMarkConversationRead, targetUserId]);

  // Cancel pending read timer on unmount
  useEffect(() => {
    return () => {
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
        markReadTimeoutRef.current = null;
      }
    };
  }, []);

  // Re-schedule read when the browser tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) scheduleMarkConversationRead();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scheduleMarkConversationRead]);

  return scheduleMarkConversationRead;
}
