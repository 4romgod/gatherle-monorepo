'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Avatar, Box, ButtonBase, Container, Skeleton, Typography } from '@mui/material';
import { ReadFollowedMomentsDocument } from '@/data/graphql/query';
import { EventMomentState, type ReadFollowedMomentsQuery } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import EventMomentViewer from './EventMomentViewer';

type Moment = ReadFollowedMomentsQuery['readFollowedMoments']['items'][number];

/** Groups moments by authorId so each followed user gets one bubble. */
function groupByAuthor(moments: Moment[]): Map<string, Moment[]> {
  const map = new Map<string, Moment[]>();
  for (const moment of moments) {
    if (!map.has(moment.authorId)) map.set(moment.authorId, []);
    map.get(moment.authorId)!.push(moment);
  }
  return map;
}

export default function FollowedMomentsBar() {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading } = useQuery(ReadFollowedMomentsDocument, {
    variables: { limit: 100 },
    context: token ? { headers: getAuthHeader(token) } : undefined,
    fetchPolicy: 'cache-and-network',
    skip: !token,
  });

  const [viewerMoments, setViewerMoments] = useState<Moment[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const moments = (data?.readFollowedMoments?.items ?? []).filter((m) => m.state === EventMomentState.Ready);
  const authorGroups = groupByAuthor(moments);

  const openViewer = (authorMoments: Moment[]) => {
    setViewerMoments(authorMoments);
    setViewerIndex(0);
    setViewerOpen(true);
  };

  if (loading && moments.length === 0) {
    return (
      <Box>
        <Container maxWidth="md" disableGutters sx={{ px: { xs: 2, md: 0 } }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              py: 1.5,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Box
                key={i}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, flexShrink: 0 }}
              >
                <Skeleton variant="circular" width={80} height={80} />
                <Skeleton variant="text" width={56} height={12} />
              </Box>
            ))}
          </Box>
        </Container>
      </Box>
    );
  }

  if (authorGroups.size === 0) return null;

  return (
    <>
      <Box>
        <Container maxWidth="md" disableGutters sx={{ px: { xs: 2, md: 0 } }}>
          {/* Bubbles row */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1.5, md: 2 },
              overflowX: 'auto',
              py: 1.25,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {Array.from(authorGroups.entries()).map(([authorId, authorMoments]) => {
              const first = authorMoments[0];
              const author = first.author;
              const displayName = author?.given_name ?? author?.username ?? 'User';
              const avatarSrc = author?.profile_picture ?? undefined;
              const initials = author?.given_name?.[0]?.toUpperCase() ?? author?.username?.[0]?.toUpperCase() ?? '?';

              return (
                <ButtonBase
                  key={authorId}
                  onClick={() => openViewer(authorMoments)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.75,
                    flexShrink: 0,
                    borderRadius: 1,
                    userSelect: 'none',
                  }}
                >
                  <Box
                    sx={{
                      p: '2.5px',
                      borderRadius: '50%',
                      background: (theme) => theme.palette.hero.gradient,
                    }}
                  >
                    <Avatar
                      src={avatarSrc}
                      alt={displayName}
                      sx={{
                        width: { xs: 80, md: 96 },
                        height: { xs: 80, md: 96 },
                        border: '2.5px solid',
                        borderColor: 'background.paper',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                      }}
                    >
                      {initials}
                    </Avatar>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: '0.65rem',
                      maxWidth: 80,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                  >
                    {displayName}
                  </Typography>
                </ButtonBase>
              );
            })}
          </Box>
        </Container>
      </Box>

      <EventMomentViewer
        moments={viewerMoments}
        startIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        organizerIds={[]}
        onDeleted={(momentId) => {
          setViewerMoments((prev) => prev.filter((m) => m.momentId !== momentId));
        }}
      />
    </>
  );
}
