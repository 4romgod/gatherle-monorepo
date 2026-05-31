'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, CircularProgress, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { FiBookmark, FiCalendar, FiCheckSquare, FiClock } from 'react-icons/fi';
import {
  ROUTES,
  BUTTON_STYLES,
  SECTION_TITLE_STYLES,
  EMPTY_STATE_STYLES,
  EMPTY_STATE_ICON_STYLES,
} from '@/lib/constants';
import { AnyEventPreview, getEventPreviewKey } from '@/components/events/event-preview-utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ProfileEventTile from './ProfileEventTile';

interface ProfileEventsTabsProps {
  upcomingRsvpdEvents: AnyEventPreview[];
  pastRsvpdEvents: AnyEventPreview[];
  organizedEvents: AnyEventPreview[];
  organizedEventsHasMore?: boolean;
  organizedEventsLoadingMore?: boolean;
  onLoadMoreOrganized?: () => void;
  savedEvents?: AnyEventPreview[];
  isOwnProfile: boolean;
  emptyCreatedCta?: React.ReactNode;
}

export default function ProfileEventsTabs({
  upcomingRsvpdEvents,
  pastRsvpdEvents,
  organizedEvents,
  organizedEventsHasMore = false,
  organizedEventsLoadingMore = false,
  onLoadMoreOrganized,
  savedEvents = [],
  isOwnProfile,
  emptyCreatedCta,
}: ProfileEventsTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabIconSx = {
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: { xs: 18, md: 19 },
    justifyContent: 'center',
    lineHeight: 0,
  } as const;
  const emptyIconSx = {
    color: 'text.secondary',
    display: 'inline-flex',
    fontSize: { xs: 42, md: 48 },
    lineHeight: 0,
  } as const;

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
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTabs-indicator': {
            display: 'none',
          },
          '& .MuiTab-root': {
            minHeight: { xs: 38, md: 42 },
            minWidth: 'auto',
            position: 'relative',
            py: { xs: 1.125, md: 1.5 },
            color: 'text.secondary',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: { xs: 52, md: 56 },
              height: 2.5,
              borderRadius: 999,
              backgroundColor: 'transparent',
            },
            '&.Mui-selected': {
              color: 'primary.main',
            },
            '&.Mui-selected::after': {
              backgroundColor: 'primary.main',
            },
          },
          '& .MuiTab-icon': {
            margin: '0 !important',
          },
        }}
      >
        <Tab
          aria-label="Going"
          icon={
            <Tooltip title="Going — events you've RSVPed to" placement="bottom" arrow>
              <Box component="span" sx={tabIconSx}>
                <FiCheckSquare />
              </Box>
            </Tooltip>
          }
        />
        <Tab
          aria-label="Attended"
          icon={
            <Tooltip title="Attended — past events you went to" placement="bottom" arrow>
              <Box component="span" sx={tabIconSx}>
                <FiClock />
              </Box>
            </Tooltip>
          }
        />
        <Tab
          aria-label="Hosted"
          icon={
            <Tooltip title="Hosted — events you've created or co-hosted" placement="bottom" arrow>
              <Box component="span" sx={tabIconSx}>
                <FiCalendar />
              </Box>
            </Tooltip>
          }
        />
        {isOwnProfile && (
          <Tab
            aria-label="Saved"
            icon={
              <Tooltip title="Saved — bookmarked events" placement="bottom" arrow>
                <Box component="span" sx={tabIconSx}>
                  <FiBookmark />
                </Box>
              </Tooltip>
            }
          />
        )}
      </Tabs>

      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        {activeTab === 0 && (
          <EventTabPanel
            events={upcomingRsvpdEvents}
            emptyIcon={
              <Box component="span" sx={emptyIconSx}>
                <FiCheckSquare />
              </Box>
            }
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
            emptyIcon={
              <Box component="span" sx={emptyIconSx}>
                <FiClock />
              </Box>
            }
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
            emptyIcon={
              <Box component="span" sx={emptyIconSx}>
                <FiCalendar />
              </Box>
            }
            emptyTitle="No events hosted yet"
            emptyDescription="Start hosting events and they'll appear here"
            emptyCta={defaultEmptyCreatedCta}
            hasMore={organizedEventsHasMore}
            loadingMore={organizedEventsLoadingMore}
            onLoadMore={onLoadMoreOrganized}
          />
        )}

        {isOwnProfile && activeTab === 3 && (
          <EventTabPanel
            events={savedEvents ?? []}
            emptyIcon={
              <Box component="span" sx={emptyIconSx}>
                <FiBookmark />
              </Box>
            }
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
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: {
  events: AnyEventPreview[];
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyCta?: React.ReactNode;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const loadMoreTriggerRef = useInfiniteScroll({
    enabled: hasMore && Boolean(onLoadMore),
    loading: loadingMore,
    onEndReached: () => onLoadMore?.(),
  });

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
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
            xl: 'repeat(5, minmax(0, 1fr))',
          },
          gap: { xs: 0.625, md: 1 },
        }}
      >
        {events.map((event) => (
          <ProfileEventTile key={getEventPreviewKey(event)} event={event} />
        ))}
      </Box>
      {hasMore ? (
        <Box ref={loadMoreTriggerRef} sx={{ mt: 2, display: 'flex', justifyContent: 'center', minHeight: 24 }}>
          {loadingMore ? <CircularProgress size={20} /> : null}
        </Box>
      ) : null}
    </Box>
  );
}
