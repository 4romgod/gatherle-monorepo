'use client';

import { alpha, Box, Stack, Typography } from '@mui/material';
import EventSearchBar from '@/components/search/EventSearchBar';

interface EventsHeaderProps {
  eventCount: number;
}

export default function EventsHeader({ eventCount }: EventsHeaderProps) {
  return (
    <Box mb={4}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h3" fontWeight={700} className="glow-text" sx={{ mb: 1 }}>
            Discover Events
          </Typography>
          <Typography
            variant="body1"
            sx={(theme) => ({
              color: alpha(theme.palette.common.white, 0.7),
            })}
          >
            Find the perfect event for you from {eventCount} available events
          </Typography>
        </Box>
      </Stack>

      <EventSearchBar placeholder="Search events by title, location, or category..." size="medium" />
    </Box>
  );
}
