'use client';

import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';

const mockThreads = [
  {
    id: 1,
    senderName: 'Jane Doe',
    senderAvatar: '/api/placeholder/100/100',
    lastMessage: 'Looking forward to the event!',
    timestamp: new Date(),
    messages: [
      {
        id: 1,
        fromMe: false,
        message: 'Hi! Are you attending the meeting?',
        timestamp: new Date(Date.now() - 7200000),
      },
      {
        id: 2,
        fromMe: true,
        message: 'Yes! Really excited about it.',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: 3,
        fromMe: false,
        message: 'Cool, let’s meet near the entrance at 6PM.',
        timestamp: new Date(Date.now() - 1800000),
      },
    ],
  },
  {
    id: 2,
    senderName: 'John Smith',
    senderAvatar: '/api/placeholder/100/100?text=JS',
    lastMessage: 'Can you share the venue details again?',
    timestamp: new Date(Date.now() - 86400000),
    messages: [
      {
        id: 1,
        fromMe: false,
        message: 'Hey! Can you share the venue again?',
        timestamp: new Date(Date.now() - 90000000),
      },
    ],
  },
  {
    id: 3,
    senderName: 'Sarah Lee',
    senderAvatar: '/api/placeholder/100/100?text=SL',
    lastMessage: 'Thanks for organizing the meeting!',
    timestamp: new Date(Date.now() - 2 * 86400000),
    messages: [
      {
        id: 1,
        fromMe: true,
        message: 'Thanks for attending!',
        timestamp: new Date(Date.now() - 172800000),
      },
      {
        id: 2,
        fromMe: false,
        message: 'Thanks for organizing the meeting!',
        timestamp: new Date(Date.now() - 171000000),
      },
    ],
  },
];

export default function MessagesPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<number>(mockThreads[0].id);

  const selectedThread = mockThreads.find(t => t.id === selectedThreadId);

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight="bold" mb={3}>
          Messages
        </Typography>

        <Grid container spacing={2}>
          {/* Left: Threads list */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ minHeight: '90vh' }}>
              <List disablePadding>
                {mockThreads.map((thread, index) => (
                  <React.Fragment key={thread.id}>
                    <ListItem
                      alignItems="flex-start"
                      // TODO selected={thread.id === selectedThreadId}
                      onClick={() => setSelectedThreadId(thread.id)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        '&:hover': { backgroundColor: 'action.hover', cursor: 'pointer' },
                        backgroundColor: thread.id === selectedThreadId ? 'action.selected' : 'inherit',
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar src={thread.senderAvatar} alt={thread.senderName} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" fontWeight="medium">
                            {thread.senderName}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" component="span" noWrap>
                            {thread.lastMessage}
                          </Typography>
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {format(thread.timestamp, 'HH:mm')}
                      </Typography>
                    </ListItem>
                    {index < mockThreads.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Right: Conversation view */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2, minHeight: '90vh' }}>
              {selectedThread ? (
                <>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Chat with {selectedThread.senderName}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box display="flex" flexDirection="column" gap={2}>
                    {selectedThread.messages.map(msg => (
                      <Box
                        key={msg.id}
                        sx={{
                          alignSelf: msg.fromMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          backgroundColor: msg.fromMe ? 'primary.main' : 'background.default',
                          color: msg.fromMe ? 'primary.contrastText' : 'text.primary',
                          p: 1.5,
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2">{msg.message}</Typography>
                        <Typography variant="caption" display="block" align={msg.fromMe ? 'right' : 'left'}>
                          {format(msg.timestamp, 'HH:mm')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  Select a conversation to view messages.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
