'use client';

import { Box, Stack, Typography, Alert, Button } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { EventPreview } from '@/data/graphql/query/Event/types';
import EventTileGrid from '@/components/events/EventTileGrid';

interface EventsListProps {
  events: EventPreview[];
  loading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export default function EventsList({
  events,
  loading,
  error,
  hasActiveFilters,
  onClearFilters,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: EventsListProps) {
  const showSkeletons = loading;

  if (error) {
    return (
      <Alert severity="error" onClose={() => window.location.reload()} sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!loading && events.length === 0) {
    return (
      <Box
        className="glass-card"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          textAlign: 'center',
          p: 6,
        }}
      >
        <Typography variant="h5" fontWeight={600} sx={{ color: 'text.primary', mb: 2 }}>
          No Events Found
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          Try adjusting your filters or search criteria
        </Typography>
        {hasActiveFilters && (
          <Button variant="contained" onClick={onClearFilters} startIcon={<ClearIcon />}>
            Clear All Filters
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary', marginTop: 5 }}>
          {showSkeletons ? 'Loading events…' : `${events.length} Event${events.length !== 1 ? 's' : ''} Found`}
        </Typography>
      </Stack>
      <EventTileGrid events={events} loading={showSkeletons} />
      {hasMore && onLoadMore && (
        <Box
          sx={{
            mt: 4,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="outlined"
            onClick={onLoadMore}
            disabled={loading || loadingMore}
            sx={{ textTransform: 'none', px: 4, py: 1.5 }}
          >
            {loadingMore ? 'Loading more events…' : 'Load more events'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
