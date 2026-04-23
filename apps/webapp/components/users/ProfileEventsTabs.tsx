'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, Grid, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import {
  EventAvailable as GoingIcon,
  Event as EventIcon,
  History as PastIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import EventBoxSm from '@/components/events/eventBoxSm';
import { EventPreview } from '@/data/graphql/query/Event/types';
import {
  ROUTES,
  BUTTON_STYLES,
  SECTION_TITLE_STYLES,
  EMPTY_STATE_STYLES,
  EMPTY_STATE_ICON_STYLES,
} from '@/lib/constants';

interface ProfileEventsTabsProps {
  upcomingRsvpdEvents: EventPreview[];
  pastRsvpdEvents: EventPreview[];
  organizedEvents: EventPreview[];
  savedEvents?: EventPreview[];
  isOwnProfile: boolean;
  emptyCreatedCta?: React.ReactNode;
}

export default function ProfileEventsTabs({
  upcomingRsvpdEvents,
  pastRsvpdEvents,
  organizedEvents,
  savedEvents = [],
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
    <Card
      elevation={0}
      sx={{ p: 0, overflow: 'hidden', borderRadius: 0, border: 'none', bgcolor: 'background.default' }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{
          '& .MuiTab-root': {
            py: 2,
            minWidth: 'auto',
            minHeight: 56,
          },
          '& .MuiTab-iconWrapper': {
            mb: 0,
          },
        }}
      >
        <Tab
          aria-label="Going"
          icon={
            <Tooltip title="Going — events you've RSVPed to" placement="bottom" arrow>
              <GoingIcon sx={{ fontSize: 28 }} />
            </Tooltip>
          }
        />
        <Tab
          aria-label="Attended"
          icon={
            <Tooltip title="Attended — past events you went to" placement="bottom" arrow>
              <PastIcon sx={{ fontSize: 28 }} />
            </Tooltip>
          }
        />
        <Tab
          aria-label="Hosted"
          icon={
            <Tooltip title="Hosted — events you've created or co-hosted" placement="bottom" arrow>
              <EventIcon sx={{ fontSize: 28 }} />
            </Tooltip>
          }
        />
        {isOwnProfile && (
          <Tab
            aria-label="Saved"
            icon={
              <Tooltip title="Saved — bookmarked events" placement="bottom" arrow>
                <BookmarkIcon sx={{ fontSize: 28 }} />
              </Tooltip>
            }
          />
        )}
      </Tabs>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {activeTab === 0 && (
          <EventTabPanel
            events={upcomingRsvpdEvents}
            emptyIcon={<GoingIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
            emptyTitle="No upcoming events"
            emptyDescription="RSVP to events and they'll appear here"
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

        {activeTab === 1 && (
          <EventTabPanel
            events={pastRsvpdEvents}
            emptyIcon={<PastIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
            emptyTitle="No attended events"
            emptyDescription="Events you've attended will show up here"
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

        {activeTab === 2 && (
          <EventTabPanel
            events={organizedEvents}
            emptyIcon={<EventIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
            emptyTitle="No events hosted yet"
            emptyDescription="Start hosting events and they'll appear here"
            emptyCta={defaultEmptyCreatedCta}
          />
        )}

        {isOwnProfile && activeTab === 3 && (
          <EventTabPanel
            events={savedEvents ?? []}
            emptyIcon={<BookmarkIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
            emptyTitle="No saved events yet"
            emptyDescription="Bookmark events you're interested in to view them later"
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
        <Grid key={event.eventId} size={{ xs: 12, sm: 4 }}>
          <EventBoxSm event={event} />
        </Grid>
      ))}
    </Grid>
  );
}
