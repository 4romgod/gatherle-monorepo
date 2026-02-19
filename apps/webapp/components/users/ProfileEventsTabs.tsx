'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, Grid, Tab, Tabs, Typography } from '@mui/material';
import {
  CalendarMonth,
  CheckCircle as RSVPIcon,
  Event as EventIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import EventBoxSm from '@/components/events/eventBoxSm';
import { EventPreview } from '@/data/graphql/query/Event/types';
import {
  ROUTES,
  CARD_STYLES,
  BUTTON_STYLES,
  SECTION_TITLE_STYLES,
  EMPTY_STATE_STYLES,
  EMPTY_STATE_ICON_STYLES,
} from '@/lib/constants';

interface ProfileEventsTabsProps {
  organizedEvents: EventPreview[];
  rsvpdEvents: EventPreview[];
  savedEvents: EventPreview[];
  isOwnProfile: boolean;
  emptyCreatedCta?: React.ReactNode;
}

export default function ProfileEventsTabs({
  organizedEvents,
  rsvpdEvents,
  savedEvents,
  isOwnProfile,
  emptyCreatedCta,
}: ProfileEventsTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const defaultEmptyCreatedCta = emptyCreatedCta ?? (
    <Button
      variant="contained"
      color="secondary"
      component={Link}
      href={isOwnProfile ? ROUTES.ACCOUNT.EVENTS.CREATE : ROUTES.EVENTS.ROOT}
      sx={{ ...BUTTON_STYLES, mt: 2 }}
    >
      {isOwnProfile ? 'Create Your First Event' : 'Explore Events'}
    </Button>
  );

  return (
    <Card elevation={0} sx={{ ...CARD_STYLES, p: 0, overflow: 'hidden' }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            py: 2,
          },
        }}
      >
        <Tab
          icon={<EventIcon sx={{ fontSize: 20 }} />}
          iconPosition="start"
          label={`Created (${organizedEvents.length})`}
        />
        <Tab
          icon={<RSVPIcon sx={{ fontSize: 20 }} />}
          iconPosition="start"
          label={`Attending (${rsvpdEvents.length})`}
        />
        {isOwnProfile && (
          <Tab
            icon={<BookmarkIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`Saved (${savedEvents.length})`}
          />
        )}
      </Tabs>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {activeTab === 0 && (
          <EventTabPanel
            events={organizedEvents}
            emptyIcon={<CalendarMonth sx={{ fontSize: 48, color: 'text.secondary' }} />}
            emptyTitle="No events created yet"
            emptyDescription="Start hosting events and they'll appear here"
            emptyCta={defaultEmptyCreatedCta}
          />
        )}

        {activeTab === 1 && (
          <EventTabPanel
            events={rsvpdEvents}
            emptyIcon={<RSVPIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
            emptyTitle="No RSVPs yet"
            emptyDescription="Browse events and RSVP to ones you're interested in"
            emptyCta={
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                href={ROUTES.EVENTS.ROOT}
                sx={{ ...BUTTON_STYLES, mt: 2 }}
              >
                Explore Events
              </Button>
            }
          />
        )}

        {isOwnProfile && activeTab === 2 && (
          <EventTabPanel
            events={savedEvents}
            emptyIcon={<BookmarkIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
            emptyTitle="No saved events yet"
            emptyDescription="Save events you're interested in to view them later"
            emptyCta={
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                href={ROUTES.EVENTS.ROOT}
                sx={{ ...BUTTON_STYLES, mt: 2 }}
              >
                Explore Events
              </Button>
            }
          />
        )}
      </Box>
    </Card>
  );
}

function EventTabPanel({
  events,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyCta,
}: {
  events: EventPreview[];
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyCta?: React.ReactNode;
}) {
  if (events.length === 0) {
    return (
      <Box sx={EMPTY_STATE_STYLES}>
        <Box sx={EMPTY_STATE_ICON_STYLES}>{emptyIcon}</Box>
        <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
          {emptyTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
          {emptyDescription}
        </Typography>
        {emptyCta}
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {events.map((event) => (
        <Grid key={event.eventId} size={{ xs: 12, sm: 6 }}>
          <EventBoxSm event={event} />
        </Grid>
      ))}
    </Grid>
  );
}
