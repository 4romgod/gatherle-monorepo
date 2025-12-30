'use client';

import React from 'react';
import {
  Avatar,
  Box,
  Container,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

const mockNotifications = [
  {
    id: 1,
    title: 'New Message from Jane Doe',
    description: '“Looking forward to the event!”',
    avatar: '/api/placeholder/100/100',
    timestamp: new Date(),
  },
  {
    id: 2,
    title: 'Event Reminder',
    description: 'Don’t forget your meeting at 6PM today.',
    avatar: '/api/placeholder/100/100?text=E',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: 3,
    title: 'New RSVP',
    description: 'Sarah Lee has RSVP’d to your event.',
    avatar: '/api/placeholder/100/100?text=SL',
    timestamp: new Date(Date.now() - 2 * 86400000),
  },
];

export default function NotificationsPage() {
  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Notifications
        </Typography>

        <Paper>
          <List disablePadding>
            {mockNotifications.map((notif, index) => (
              <React.Fragment key={notif.id}>
                <ListItem
                  sx={{
                    px: 2,
                    py: 1.5,
                    '&:hover': { backgroundColor: 'action.hover', cursor: 'pointer' },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={notif.avatar} alt={notif.title} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight="medium">
                        {notif.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary" component="span">
                          {notif.description}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" display="block" component="span" mt={0.5}>
                          {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < mockNotifications.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  );
}
