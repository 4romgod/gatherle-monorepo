'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { alpha, Avatar, Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { GetMomentsFeedDocument } from '@/data/graphql/query';
import { EventMomentState, EventMomentType, type GetMomentsFeedQuery } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { ROUTES } from '@/lib/constants';
import EventMomentViewer from './EventMomentViewer';

type Moment = GetMomentsFeedQuery['readMomentsFeed']['items'][number];

const BG_PALETTE: Record<string, string> = {
  'bg-purple-600': '#9333ea',
  'bg-blue-600': '#2563eb',
  'bg-green-600': '#16a34a',
  'bg-red-600': '#dc2626',
  'bg-orange-500': '#f97316',
  'bg-pink-600': '#db2777',
  'bg-indigo-600': '#4f46e5',
  'bg-teal-600': '#0d9488',
  'bg-yellow-400': '#facc15',
  'bg-cyan-500': '#06b6d4',
};

function resolveMomentBackground(token?: string | null): string {
  if (!token) return '#9333ea';
  return BG_PALETTE[token] ?? '#9333ea';
}

function getDisplayName(moment: Moment): string {
  const author = moment.author;
  return (
    [author?.given_name, author?.family_name].filter(Boolean).join(' ').trim() || author?.username || 'Gatherle member'
  );
}

export default function MomentsFeedPageClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.user?.token;
  const [viewerOpen, setViewerOpen] = useState(true);
  const [viewerIndex, setViewerIndex] = useState(0);

  const { data, loading, error } = useQuery(GetMomentsFeedDocument, {
    context: token ? { headers: getAuthHeader(token) } : undefined,
    fetchPolicy: 'cache-and-network',
    variables: { limit: 60 },
  });

  const moments = useMemo(
    () =>
      (data?.readMomentsFeed.items ?? [])
        .filter((moment) => moment.state === EventMomentState.Ready)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [data?.readMomentsFeed.items],
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
      <Container maxWidth="sm" sx={{ alignItems: 'center', display: 'flex', minHeight: '70vh' }}>
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
      <Container maxWidth="sm" sx={{ alignItems: 'center', display: 'flex', minHeight: '70vh' }}>
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
    <Box sx={{ bgcolor: 'common.black', minHeight: '100dvh', pb: { xs: 7, md: 0 } }}>
      <Box
        sx={{
          height: { xs: 'calc(100dvh - 60px)', md: '100dvh' },
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
        }}
      >
        {moments.map((moment, index) => {
          const displayName = getDisplayName(moment);
          const isTextMoment = moment.type === EventMomentType.Text;

          return (
            <Box
              key={moment.momentId}
              onClick={() => {
                setViewerIndex(index);
                setViewerOpen(true);
              }}
              sx={{
                alignItems: 'center',
                bgcolor: {
                  xs: isTextMoment ? resolveMomentBackground(moment.background) : 'common.black',
                  md: 'common.black',
                },
                cursor: 'pointer',
                display: 'flex',
                height: { xs: 'calc(100dvh - 60px)', md: '100dvh' },
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                scrollSnapAlign: 'start',
                px: { md: 2 },
              }}
            >
              <Box
                sx={{
                  bgcolor: isTextMoment ? resolveMomentBackground(moment.background) : 'common.black',
                  borderRadius: { xs: 0, md: 4 },
                  height: { xs: '100%', md: 'min(86dvh, 860px)' },
                  maxWidth: { md: 420 },
                  overflow: 'hidden',
                  position: 'relative',
                  width: '100%',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.25}
                  sx={{
                    left: 16,
                    position: 'absolute',
                    right: 18,
                    top: 18,
                    zIndex: 2,
                  }}
                >
                  <Avatar
                    src={moment.author?.profile_picture ?? undefined}
                    sx={{ border: '2px solid white', height: 40, width: 40 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography color="common.white" fontWeight={800} noWrap>
                      {displayName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: (theme) => alpha(theme.palette.common.white, 0.72) }}>
                      {moment.event?.title ?? 'Moment'}
                    </Typography>
                  </Box>
                </Stack>

                {moment.type === EventMomentType.Image && moment.mediaUrl ? (
                  <Box
                    component="img"
                    src={moment.mediaUrl}
                    alt={moment.caption ?? 'Moment'}
                    sx={{ height: '100%', objectFit: 'cover', width: '100%' }}
                  />
                ) : moment.type === EventMomentType.Video && moment.mediaUrl ? (
                  <Box
                    component="video"
                    src={moment.mediaUrl}
                    poster={moment.thumbnailUrl ?? undefined}
                    muted
                    playsInline
                    sx={{ height: '100%', objectFit: 'cover', width: '100%' }}
                  />
                ) : (
                  <Box
                    sx={{
                      alignItems: 'center',
                      display: 'flex',
                      height: '100%',
                      justifyContent: 'center',
                      width: '100%',
                    }}
                  >
                    <Typography
                      color="common.white"
                      fontWeight={900}
                      sx={{ fontSize: { xs: 30, md: 24 }, maxWidth: 520, px: 4, textAlign: 'center' }}
                    >
                      {moment.caption || 'Moment'}
                    </Typography>
                  </Box>
                )}

                {moment.type !== EventMomentType.Text && moment.caption ? (
                  <Typography
                    color="common.white"
                    sx={{
                      bgcolor: (theme) => alpha(theme.palette.common.black, 0.34),
                      borderRadius: 2,
                      bottom: 26,
                      left: 18,
                      maxWidth: 560,
                      px: 1.5,
                      py: 1,
                      position: 'absolute',
                      right: 18,
                    }}
                  >
                    {moment.caption}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>

      <EventMomentViewer
        moments={moments}
        startIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => router.push(ROUTES.HOME)}
        organizerIds={[]}
      />
    </Box>
  );
}
