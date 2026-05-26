'use client';

import { Box, Stack, Typography, Alert, Button, CircularProgress } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import EventTileGrid from '@/components/events/EventTileGrid';
import EventTileSkeletonGrid from '@/components/events/EventTileSkeleton';
import type { AnyEventPreview } from '@/components/events/event-preview-utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const NEXT_PAGE_PLACEHOLDER_COUNT = 10;

interface EventsListProps {
  events: AnyEventPreview[];
  loading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  totalCount?: number;
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
  totalCount,
}: EventsListProps) {
  const showSkeletons = loading && events.length === 0;
  const loadMoreTriggerRef = useInfiniteScroll({
    enabled: hasMore && Boolean(onLoadMore),
    loading: loading || loadingMore,
    onEndReached: () => onLoadMore?.(),
  });

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
          {showSkeletons
            ? 'Loading events…'
            : `${totalCount ?? events.length} Event${(totalCount ?? events.length) !== 1 ? 's' : ''} Found`}
        </Typography>
      </Stack>
      <EventTileGrid events={events} loading={showSkeletons} />
      {loadingMore ? (
        <Box sx={{ mt: 2 }}>
          <EventTileSkeletonGrid count={NEXT_PAGE_PLACEHOLDER_COUNT} />
        </Box>
      ) : null}
      {hasMore && onLoadMore && (
        <Box
          ref={loadMoreTriggerRef}
          sx={{
            mt: 5,
            mb: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            minHeight: loadingMore ? 0 : 72,
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {typeof totalCount === 'number' ? `Showing ${events.length} of ${totalCount}` : `Showing ${events.length}`}
          </Typography>
          <Box sx={{ minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loadingMore ? <CircularProgress size={20} /> : null}
          </Box>
        </Box>
      )}
    </Box>
  );
}
