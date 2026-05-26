'use client';

import type { MouseEvent } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { FiCheck, FiMail } from 'react-icons/fi';
import { useChatActions } from '@/hooks/useChat';
import { logger } from '@/lib/utils';

type ConversationUnreadToggleButtonProps = {
  unreadCount: number;
  withUserId: string;
};

export function ConversationUnreadToggleButton({ unreadCount, withUserId }: ConversationUnreadToggleButtonProps) {
  const { markConversationRead, markConversationUnread, markConversationReadLoading, markConversationUnreadLoading } =
    useChatActions();

  const isUnread = unreadCount > 0;
  const isLoading = markConversationReadLoading || markConversationUnreadLoading;

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      if (isUnread) {
        await markConversationRead(withUserId);
        return;
      }

      await markConversationUnread(withUserId);
    } catch (error) {
      logger.error('Failed to toggle chat conversation unread state', {
        error,
        isUnread,
        withUserId,
      });
    }
  };

  return (
    <Tooltip title={isUnread ? 'Mark as read' : 'Mark as unread'}>
      <span>
        <IconButton
          aria-label={isUnread ? 'Mark conversation as read' : 'Mark conversation as unread'}
          disabled={isLoading}
          edge="end"
          onClick={handleClick}
          size="small"
          sx={{
            color: isUnread ? 'primary.main' : 'text.secondary',
            p: 0.75,
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          {isUnread ? <FiCheck size={16} /> : <FiMail size={16} />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
