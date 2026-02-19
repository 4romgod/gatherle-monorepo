'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { GetAllUsersDocument, type QueryOptionsInput } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { useChatRealtime } from '@/hooks';
import { SEARCH_DEBOUNCE_MS, USER_SEARCH_FIELDS, type ShareUser } from '@/components/events/share';
import { logger } from '@/lib/utils';

interface UseShareDialogOptions {
  eventTitle: string;
  resolvedEventUrl: string;
}

export function useShareDialog({ eventTitle, resolvedEventUrl }: UseShareDialogOptions) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const currentUserId = session?.user?.userId;

  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sentUserIds, setSentUserIds] = useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [loadUsers, { data, loading }] = useLazyQuery(GetAllUsersDocument, {
    fetchPolicy: 'network-only',
  });

  const { sendChatMessage } = useChatRealtime({ enabled: open });

  const users = useMemo(() => {
    const allUsers = (data?.readUsers ?? []) as ShareUser[];
    return allUsers.filter((user) => user.userId !== currentUserId);
  }, [currentUserId, data?.readUsers]);

  const loadShareUsers = useCallback(
    async (term: string) => {
      const trimmedTerm = term.trim();
      const options: QueryOptionsInput = {
        pagination: { limit: 56 },
      };

      if (trimmedTerm) {
        options.search = {
          fields: USER_SEARCH_FIELDS,
          value: trimmedTerm,
        };
      }

      try {
        await loadUsers({
          variables: { options },
          context: {
            headers: getAuthHeader(token),
          },
        });
      } catch (error) {
        // TODO: Surface error state instead of allowing an unhandled promise rejection.
        logger.error('Failed to load share users', error);
      }
    },
    [loadUsers, token],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadShareUsers('');
  }, [loadShareUsers, open]);

  useEffect(() => {
    if (!open || !searchValue) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadShareUsers(searchValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [loadShareUsers, open, searchValue]);

  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    setFeedbackOpen(true);
  };

  const openDialog = () => setOpen(true);

  const closeDialog = () => {
    setOpen(false);
    setSearchValue('');
    setSelectedUserIds(new Set());
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((previous) => {
      const next = new Set(previous);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSendSelected = () => {
    if (selectedUserIds.size === 0) {
      return;
    }

    const messagePayload = `${eventTitle}\n${resolvedEventUrl}`;
    let sentCount = 0;
    const selectedIds = Array.from(selectedUserIds);
    selectedIds.forEach((recipientUserId) => {
      const sent = sendChatMessage(recipientUserId, messagePayload);
      if (sent) {
        sentCount += 1;
      }
    });

    if (sentCount === 0) {
      showFeedback('Chat is not connected yet. Try again in a moment.');
      return;
    }

    setSentUserIds((previous) => {
      const next = new Set(previous);
      selectedIds.forEach((userId) => next.add(userId));
      return next;
    });

    setSelectedUserIds(new Set());
    showFeedback(`Sent to ${sentCount} ${sentCount === 1 ? 'person' : 'people'}.`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(resolvedEventUrl);
      showFeedback('Link copied.');
    } catch {
      showFeedback('Unable to copy link.');
    }
  };

  const closeFeedback = () => setFeedbackOpen(false);

  return {
    open,
    openDialog,
    closeDialog,
    searchValue,
    setSearchValue,
    users,
    loading,
    selectedUserIds,
    sentUserIds,
    toggleUserSelection,
    handleSendSelected,
    handleCopyLink,
    feedbackMessage,
    feedbackOpen,
    closeFeedback,
  };
}
