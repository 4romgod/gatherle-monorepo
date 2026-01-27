'use client';

import { alpha, Box, Stack, Typography } from '@mui/material';
import SearchBox from '@/components/search/SearchBox';

interface EventsHeaderProps {
  eventCount: number;
  eventTitles: string[];
  onSearch: (query: string) => void;
}

export default function EventsHeader({ eventCount, eventTitles, onSearch }: EventsHeaderProps) {
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

      <SearchBox
        itemList={eventTitles}
        onSearch={onSearch}
        sx={{
          maxWidth: 600,
          mb: 3,
        }}
      />
    </Box>
  );
}
