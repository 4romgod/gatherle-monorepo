'use client';

import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  List,
  Paper,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { DoneAll as MarkAllReadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import PendingFollowRequestsList from './follow/PendingFollowRequestsList';
import NotificationItem from './NotificationItem';
import { useNotifications, useNotificationActions } from '@/hooks';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <List disablePadding>
      {[1, 2, 3, 4, 5].map((i) => (
        <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 1.5 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="90%" height={16} />
            <Skeleton variant="text" width="30%" height={14} />
          </Box>
        </Box>
      ))}
    </List>
  );
}

export default function NotificationsPage() {
  const [tabValue, setTabValue] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { notifications, loading, error, hasMore, loadMore, refetch, unreadCount } = useNotifications({ limit: 20 });
  const { markAsRead, markAllAsRead, deleteNotification, isLoading: actionsLoading } = useNotificationActions();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: { xs: 'flex-start', md: 'space-between' },
            mb: 3,
            gap: { xs: 1, md: 0 },
          }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ mb: { xs: 1, md: 0 } }}>
            Notifications
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            {unreadCount > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<MarkAllReadIcon />}
                onClick={handleMarkAllAsRead}
                disabled={actionsLoading}
              >
                Mark all read
              </Button>
            )}
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab label={`All ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`} />
            <Tab label="Follow Requests" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {(loading && notifications.length === 0) || isRefreshing ? (
              <NotificationsSkeleton />
            ) : error ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error">Failed to load notifications</Typography>
                <Button onClick={() => refetch()} sx={{ mt: 2 }}>
                  Try Again
                </Button>
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">No notifications yet</Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                  When you get notifications, they&apos;ll show up here
                </Typography>
              </Box>
            ) : (
              <>
                <List disablePadding>
                  {notifications.map((notification, index) => (
                    <React.Fragment key={notification.notificationId}>
                      <NotificationItem
                        notification={notification}
                        onMarkRead={handleMarkAsRead}
                        onDelete={handleDelete}
                        isLoading={actionsLoading}
                      />
                      {index < notifications.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {hasMore && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Button
                      onClick={loadMore}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={16} /> : null}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <PendingFollowRequestsList />
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
}
