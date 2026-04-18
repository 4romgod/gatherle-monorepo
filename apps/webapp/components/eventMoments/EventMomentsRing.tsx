'use client';

import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Box, Avatar, Typography, Skeleton, IconButton, Tooltip } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { ReadEventMomentsDocument } from '@/data/graphql/query';
import { EventMomentState, ParticipantStatus } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import type { ReadEventMomentsQuery } from '@/data/graphql/types/graphql';

type Moment = ReadEventMomentsQuery['readEventMoments']['items'][number];

interface EventMomentsRingProps {
  eventId: string;
  /** The viewer's current RSVP status — controls whether the "add" button is shown. */
  myRsvpStatus: ParticipantStatus | null;
  onAddClick: () => void;
  onMomentClick: (moments: Moment[], startIndex: number) => void;
}

const ALLOWED_RSVP_STATUSES: ParticipantStatus[] = [ParticipantStatus.Going, ParticipantStatus.CheckedIn];

/** Groups moments by author so each attendee gets one bubble in the ring. */
function groupByAuthor(moments: Moment[]): Map<string, Moment[]> {
  const map = new Map<string, Moment[]>();
  for (const moment of moments) {
    const key = moment.authorId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(moment);
  }
  return map;
}

export default function EventMomentsRing({ eventId, myRsvpStatus, onAddClick, onMomentClick }: EventMomentsRingProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const { data, loading } = useQuery(ReadEventMomentsDocument, {
    variables: { eventId, limit: 50 },
    context: token ? { headers: getAuthHeader(token) } : undefined,
    fetchPolicy: 'cache-and-network',
  });

  const moments = (data?.readEventMoments.items ?? []).filter((m) => m.state === EventMomentState.Ready);
  const authorGroups = groupByAuthor(moments);
  const canPost = myRsvpStatus !== null && ALLOWED_RSVP_STATUSES.includes(myRsvpStatus);

  if (loading && moments.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 1,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Skeleton variant="circular" width={56} height={56} />
            <Skeleton variant="text" width={40} height={12} />
          </Box>
        ))}
      </Box>
    );
  }

  if (!canPost && moments.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        pb: 1,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {/* Add moment button — only for Going / CheckedIn attendees */}
      {canPost && (
        <Tooltip title="Add a moment" placement="top">
          <Box
            onClick={onAddClick}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '2px dashed',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.05)' },
              }}
            >
              <AddCircleIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            </Box>
            <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
              Your moment
            </Typography>
          </Box>
        </Tooltip>
      )}

      {/* One bubble per author */}
      {Array.from(authorGroups.entries()).map(([authorId, authorMoments]) => {
        const first = authorMoments[0];
        const author = first.author;
        const displayName = author?.given_name ?? author?.username ?? 'User';
        const avatarSrc = author?.profile_picture ?? undefined;
        const initials = author?.given_name?.[0]?.toUpperCase() ?? author?.username?.[0]?.toUpperCase() ?? '?';

        return (
          <Box
            key={authorId}
            onClick={() => onMomentClick(authorMoments, 0)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                p: '2px',
                borderRadius: '50%',
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.08)' },
              }}
            >
              <Avatar
                src={avatarSrc}
                alt={displayName}
                sx={{
                  width: 52,
                  height: 52,
                  border: '2px solid',
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
                maxWidth: 56,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              {displayName}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
