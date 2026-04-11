import { useCallback, useEffect, useRef, useState } from 'react';

const STICKY_BOTTOM_THRESHOLD_PX = 96;

interface UseMessageScrollParams {
  targetUserId: string | undefined;
  messagesLength: number;
}

export function useMessageScroll({ targetUserId, messagesLength }: UseMessageScrollParams) {
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messagesBottomRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const updateScrollStickiness = useCallback(() => {
    const container = messageListRef.current;
    if (!container) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom <= STICKY_BOTTOM_THRESHOLD_PX;

    shouldStickToBottomRef.current = isNearBottom;
    setShowJumpToLatest(!isNearBottom);
  }, []);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      shouldStickToBottomRef.current = true;
      setShowJumpToLatest(false);
      messagesBottomRef.current?.scrollIntoView({ behavior, block: 'end' });
      updateScrollStickiness();
    },
    [updateScrollStickiness],
  );

  // Reset scroll to bottom when the active conversation changes
  useEffect(() => {
    if (!targetUserId) return;

    shouldStickToBottomRef.current = true;
    setShowJumpToLatest(false);

    const rafId = window.requestAnimationFrame(() => {
      messagesBottomRef.current?.scrollIntoView({ block: 'end' });
      updateScrollStickiness();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [targetUserId, updateScrollStickiness]);

  // Auto-scroll when new messages arrive, if the user is at the bottom
  useEffect(() => {
    if (!targetUserId) return;

    if (shouldStickToBottomRef.current) {
      messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    setShowJumpToLatest(true);
  }, [messagesLength, targetUserId]);

  return {
    messageListRef,
    messagesBottomRef,
    showJumpToLatest,
    updateScrollStickiness,
    scrollToLatest,
  };
}
