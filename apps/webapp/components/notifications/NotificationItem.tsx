'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, Box, IconButton, ListItem, ListItemAvatar, ListItemText, Typography, Tooltip } from '@mui/material';
import {
  PersonAdd as FollowIcon,
  Check as CheckIcon,
  Event as EventIcon,
  Business as OrgIcon,
  Comment as CommentIcon,
  Security as SecurityIcon,
  Notifications as NotificationIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/hooks/useNotifications';
import { NotificationType } from '@/data/graphql/types/graphql';
import { logger } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  isLoading?: boolean;
}

/**
 * Get icon and color based on notification type
 */
function getNotificationStyle(type: NotificationType): { icon: React.ReactNode; color: string } {
  switch (type) {
    // Social notifications
    case NotificationType.FollowReceived:
    case NotificationType.FollowRequest:
    case NotificationType.FollowAccepted:
      return { icon: <FollowIcon />, color: 'primary.main' };

    // Event notifications
    case NotificationType.EventRsvp:
    case NotificationType.EventSaved:
    case NotificationType.EventCheckin:
    case NotificationType.EventReminder_24H:
    case NotificationType.EventReminder_1H:
    case NotificationType.EventUpdated:
    case NotificationType.EventCancelled:
    case NotificationType.EventRecommendation:
      return { icon: <EventIcon />, color: 'secondary.main' };

    // Organization notifications
    case NotificationType.OrgInvite:
    case NotificationType.OrgRoleChanged:
    case NotificationType.OrgEventPublished:
      return { icon: <OrgIcon />, color: 'info.main' };

    // Friend activity
    case NotificationType.FriendRsvp:
    case NotificationType.FriendCheckin:
      return { icon: <CheckIcon />, color: 'success.main' };

    // Comments
    case NotificationType.CommentReceived:
    case NotificationType.CommentReply:
    case NotificationType.CommentLiked:
      return { icon: <CommentIcon />, color: 'warning.main' };

    // Security
    case NotificationType.PasswordChanged:
    case NotificationType.NewDeviceLogin:
    case NotificationType.AccountVerified:
      return { icon: <SecurityIcon />, color: 'error.main' };

    // Mention
    case NotificationType.Mention:
      return { icon: <NotificationIcon />, color: 'primary.main' };

    default:
      return { icon: <NotificationIcon />, color: 'text.secondary' };
  }
}

export default function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  isLoading = false,
}: NotificationItemProps) {
  const { icon, color } = getNotificationStyle(notification.type);
  const timestamp =
    typeof notification.createdAt === 'string' ? new Date(notification.createdAt) : notification.createdAt;

  if (!notification.createdAt || (timestamp && isNaN(timestamp.getTime()))) {
    logger.warn('Invalid or missing timestamp for notification:', notification.notificationId, notification.createdAt);
  }

  const handleMarkRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!notification.isRead && onMarkRead) {
      onMarkRead(notification.notificationId);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.notificationId);
    }
  };

  // Get actor display name
  const actorName = notification.actor
    ? `${notification.actor.given_name} ${notification.actor.family_name}`.trim()
    : null;

  // Determine link destination
  const linkHref = notification.actionUrl || '#';
  const isClickable = !!notification.actionUrl;

  const content = (
    <ListItem
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: notification.isRead ? 'transparent' : 'action.hover',
        '&:hover': isClickable ? { bgcolor: 'action.selected' } : {},
        alignItems: 'flex-start',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: isLoading ? 0.6 : 1,
        transition: 'background-color 0.2s',
      }}
    >
      <ListItemAvatar sx={{ mt: 0.5, minWidth: 48 }}>
        {notification.actor?.profile_picture ? (
          <Avatar src={notification.actor.profile_picture} alt={actorName || 'User'} sx={{ width: 40, height: 40 }} />
        ) : (
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: color,
              color: 'white',
            }}
          >
            {icon}
          </Avatar>
        )}
      </ListItemAvatar>

      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1, pr: 1 }}>
              <Typography
                variant="body2"
                fontWeight={notification.isRead ? 400 : 600}
                color="text.primary"
                sx={{ mb: 0.25 }}
              >
                {notification.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {notification.message}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {!notification.isRead && onMarkRead && (
                <Tooltip title="Mark as read">
                  <IconButton
                    size="small"
                    onClick={handleMarkRead}
                    disabled={isLoading}
                    sx={{
                      p: 0.5,
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <MarkReadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete notification">
                  <IconButton
                    size="small"
                    onClick={handleDelete}
                    disabled={isLoading}
                    sx={{
                      p: 0.5,
                      '&:hover': { color: 'error.main' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        }
        secondary={
          <Typography variant="caption" color="text.secondary" component="span" sx={{ fontWeight: 500 }}>
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </Typography>
        }
        sx={{ m: 0 }}
      />

      {/* Unread indicator dot */}
      {!notification.isRead && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}
    </ListItem>
  );

  if (isClickable) {
    return (
      <Link href={linkHref} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
}
