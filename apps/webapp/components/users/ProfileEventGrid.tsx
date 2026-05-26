'use client';

import { Box, CircularProgress } from '@mui/material';
import { AnyEventPreview, getEventPreviewKey } from '@/components/events/event-preview-utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ProfileEventTile from './ProfileEventTile';

type ProfileEventGridProps = {
  events: AnyEventPreview[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
};

export function ProfileEventGrid({ events, hasMore = false, loadingMore = false, onLoadMore }: ProfileEventGridProps) {
  const loadMoreTriggerRef = useInfiniteScroll({
    enabled: hasMore && Boolean(onLoadMore),
    loading: loadingMore,
    onEndReached: () => onLoadMore?.(),
  });

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
          gap: { xs: 0.75, md: 1 },
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
