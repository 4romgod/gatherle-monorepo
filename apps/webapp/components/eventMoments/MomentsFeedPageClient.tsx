'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NetworkStatus, useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, CircularProgress, Container, IconButton, Stack, Typography } from '@mui/material';
import { GetMomentsFeedDocument } from '@/data/graphql/query';
import { EventMomentState, type GetMomentsFeedQuery } from '@/data/graphql/types/graphql';
import { MOBILE_BOTTOM_NAV_HEIGHT } from '@/components/navigation/MobileBottomNav';
import { getAuthHeader } from '@/lib/utils/auth';
import { ROUTES } from '@/lib/constants';
import MomentFeedSlide from './MomentFeedSlide';

type Moment = GetMomentsFeedQuery['readMomentsFeed']['items'][number];
const FEED_PAGE_SIZE = 12;

export default function MomentsFeedPageClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.user?.token;
  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenMomentIds, setHiddenMomentIds] = useState<string[]>([]);

  const { data, loading, error, fetchMore, networkStatus } = useQuery(GetMomentsFeedDocument, {
    context: token ? { headers: getAuthHeader(token) } : undefined,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    variables: { limit: FEED_PAGE_SIZE },
  });

  const moments = useMemo(
    () =>
      (data?.readMomentsFeed.items ?? [])
        .filter((moment) => moment.state === EventMomentState.Ready)
        .filter((moment) => !hiddenMomentIds.includes(moment.momentId))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [data?.readMomentsFeed.items, hiddenMomentIds],
  );
  const hasMore = data?.readMomentsFeed.hasMore ?? false;
  const nextCursor = data?.readMomentsFeed.nextCursor;
  const isFetchingMore = networkStatus === NetworkStatus.fetchMore;

  useEffect(() => {
    if (moments.length === 0) {
      if (activeIndex !== 0) {
        setActiveIndex(0);
      }
      return;
    }

    if (activeIndex >= moments.length) {
      setActiveIndex(moments.length - 1);
    }
  }, [activeIndex, moments.length]);

  const handleCloseFeed = useCallback(() => {
    if (typeof window === 'undefined') {
      router.replace(ROUTES.HOME);
      return;
    }

    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
      router.back();
      return;
    }

    router.replace(ROUTES.HOME);
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseFeed();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isFetchingMore) {
      return;
    }

    await fetchMore({
      variables: {
        cursor: nextCursor,
        limit: FEED_PAGE_SIZE,
      },
      updateQuery: (previousResult, { fetchMoreResult }) => {
        if (!fetchMoreResult?.readMomentsFeed) {
          return previousResult;
        }

        const seenIds = new Set(previousResult.readMomentsFeed.items.map((moment) => moment.momentId));
        return {
          readMomentsFeed: {
            ...fetchMoreResult.readMomentsFeed,
            items: [
              ...previousResult.readMomentsFeed.items,
              ...fetchMoreResult.readMomentsFeed.items.filter((moment) => !seenIds.has(moment.momentId)),
            ],
          },
        };
      },
    });
  }, [fetchMore, hasMore, isFetchingMore, nextCursor]);

  const handleFeedScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      const pageHeight = container.clientHeight || 1;
      const nextIndex = Math.round(container.scrollTop / pageHeight);
      if (nextIndex !== activeIndex) {
        setActiveIndex(Math.max(0, Math.min(nextIndex, moments.length - 1)));
      }

      if (container.scrollTop + container.clientHeight >= container.scrollHeight - pageHeight * 0.8) {
        void loadMore();
      }
    },
    [activeIndex, loadMore, moments.length],
  );

  if (status === 'loading' || (loading && moments.length === 0)) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          bgcolor: 'common.black',
          display: 'flex',
          minHeight: '100dvh',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={28} sx={{ color: 'common.white' }} />
      </Box>
    );
  }

  if (error && moments.length === 0) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          alignItems: 'center',
          display: 'flex',
          minHeight: { xs: `calc(100dvh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`, md: '100dvh' },
        }}
      >
        <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', width: '100%' }}>
          <Typography color="text.secondary">Moments are unavailable right now.</Typography>
          <Button variant="outlined" onClick={() => router.push(ROUTES.HOME)} sx={{ borderRadius: 999 }}>
            Back to home
          </Button>
        </Stack>
      </Container>
    );
  }

  if (moments.length === 0) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          alignItems: 'center',
          display: 'flex',
          minHeight: { xs: `calc(100dvh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`, md: '100dvh' },
        }}
      >
        <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', width: '100%' }}>
          <Typography variant="h4" fontWeight={900}>
            No moments yet
          </Typography>
          <Typography color="text.secondary">
            When people start posting from live events, they’ll show up here.
          </Typography>
          <Button variant="outlined" onClick={() => router.push(ROUTES.HOME)} sx={{ borderRadius: 999 }}>
            Back to home
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: 'common.black',
        minHeight: { xs: `calc(100dvh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`, md: '100dvh' },
        position: 'relative',
      }}
    >
      <IconButton
        aria-label="Close moments feed"
        onClick={handleCloseFeed}
        sx={{
          position: 'absolute',
          top: 18,
          right: 64,
          zIndex: 12,
          display: { xs: 'none', md: 'inline-flex' },
          color: 'common.white',
          bgcolor: 'rgba(15, 23, 42, 0.54)',
          border: '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(14px)',
          '&:hover': {
            bgcolor: 'rgba(15, 23, 42, 0.72)',
          },
        }}
      >
        <CloseIcon />
      </IconButton>

      <Box
        onScroll={handleFeedScroll}
        sx={{
          height: { xs: `calc(100dvh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`, md: '100dvh' },
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {moments.map((moment, index) => (
          <Box
            key={moment.momentId}
            sx={{
              height: { xs: `calc(100dvh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`, md: '100dvh' },
              position: 'relative',
            }}
          >
            <MomentFeedSlide
              active={index === activeIndex}
              moment={moment}
              onDeleted={(momentId) => {
                setHiddenMomentIds((current) => (current.includes(momentId) ? current : [...current, momentId]));
              }}
            />
          </Box>
        ))}
      </Box>

      {isFetchingMore ? (
        <Box
          sx={{
            position: 'absolute',
            top: 18,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <CircularProgress size={22} sx={{ color: 'common.white' }} />
        </Box>
      ) : null}
    </Box>
  );
}
