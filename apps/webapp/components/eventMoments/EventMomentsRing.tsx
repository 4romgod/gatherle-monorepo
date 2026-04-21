'use client';

import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useSession } from 'next-auth/react';
import { Box, Avatar, Typography, Skeleton, Tooltip, CircularProgress } from '@mui/material';
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
  /** The event end date/time — used to enforce the posting window on the frontend. */
  eventEndAt?: string | null;
  onAddClick: () => void;
  onMomentClick: (moments: Moment[], startIndex: number) => void;
}

const ALLOWED_RSVP_STATUSES: ParticipantStatus[] = [ParticipantStatus.Going, ParticipantStatus.CheckedIn];

/** Hours after event end during which moments can still be posted. Must match the API constant. */
const POSTING_WINDOW_HOURS = 72;

const PENDING_MOMENT_STATES = new Set<EventMomentState>([EventMomentState.UploadPending, EventMomentState.Transcoding]);

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

export default function EventMomentsRing({
  eventId,
  myRsvpStatus,
  eventEndAt,
  onAddClick,
  onMomentClick,
}: EventMomentsRingProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const viewerUserId = session?.user?.userId;

  const { data, loading, startPolling, stopPolling } = useQuery(ReadEventMomentsDocument, {
    variables: { eventId, limit: 50 },
    context: token ? { headers: getAuthHeader(token) } : undefined,
    fetchPolicy: 'cache-and-network',
  });

  const allMoments = data?.readEventMoments.items ?? [];
  const hasPendingMoment = allMoments.some((m) => PENDING_MOMENT_STATES.has(m.state));

  // Poll every 10 s while any moment is still processing so the ring refreshes when transcoding finishes.
  useEffect(() => {
    if (hasPendingMoment) {
      startPolling(10_000);
    } else {
      stopPolling();
    }
  }, [hasPendingMoment, startPolling, stopPolling]);

  // Ready moments are visible to everyone; pending moments are shown only to their author.
  const moments = allMoments.filter(
    (m) => m.state === EventMomentState.Ready || (PENDING_MOMENT_STATES.has(m.state) && m.authorId === viewerUserId),
  );
  const authorGroups = groupByAuthor(moments);
  const canPost = myRsvpStatus !== null && ALLOWED_RSVP_STATUSES.includes(myRsvpStatus);

  // Posting window: open while event is running, and for POSTING_WINDOW_HOURS after it ends.
  // If endAt is not available we default to open so we don't wrongly block attendees.
  const isWindowOpen = eventEndAt
    ? Date.now() <= new Date(eventEndAt).getTime() + POSTING_WINDOW_HOURS * 60 * 60 * 1000
    : true;

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
        <Tooltip
          title={
            isWindowOpen
              ? 'Add a moment'
              : `Moments closed — can be shared up to ${POSTING_WINDOW_HOURS}h after the event ends`
          }
          placement="top"
        >
          {/* Wrapper span lets Tooltip work even when the child is pointer-events: none */}
          <span>
            <Box
              onClick={isWindowOpen ? onAddClick : undefined}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                flexShrink: 0,
                cursor: isWindowOpen ? 'pointer' : 'default',
                opacity: isWindowOpen ? 1 : 0.4,
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '2px dashed',
                  borderColor: isWindowOpen ? 'primary.main' : 'text.disabled',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  ...(isWindowOpen && { '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.05)' } }),
                }}
              >
                <AddCircleIcon sx={{ fontSize: 28, color: isWindowOpen ? 'primary.main' : 'text.disabled' }} />
              </Box>
              <Typography
                variant="caption"
                color={isWindowOpen ? 'primary.main' : 'text.disabled'}
                fontWeight={600}
                sx={{ fontSize: '0.65rem' }}
              >
                Your moment
              </Typography>
            </Box>
          </span>
        </Tooltip>
      )}

      {/* One bubble per author */}
      {Array.from(authorGroups.entries()).map(([authorId, authorMoments]) => {
        const first = authorMoments[0];
        const author = first.author;
        const displayName = author?.given_name ?? author?.username ?? 'User';
        const avatarSrc = author?.profile_picture ?? undefined;
        const initials = author?.given_name?.[0]?.toUpperCase() ?? author?.username?.[0]?.toUpperCase() ?? '?';
        const readyMoments = authorMoments.filter((m) => m.state === EventMomentState.Ready);
        const isPending = authorMoments.some((m) => PENDING_MOMENT_STATES.has(m.state));
        const canOpenMoments = readyMoments.length > 0;

        return (
          <Box
            key={authorId}
            onClick={canOpenMoments ? () => onMomentClick(readyMoments, 0) : undefined}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              flexShrink: 0,
              cursor: canOpenMoments ? 'pointer' : 'default',
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  p: '2px',
                  borderRadius: '50%',
                  background: isPending
                    ? (theme) => theme.palette.action.disabledBackground
                    : (theme) =>
                        `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  transition: 'transform 0.2s ease',
                  opacity: isPending ? 0.6 : 1,
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
              {isPending && (
                <CircularProgress
                  size={60}
                  thickness={2}
                  sx={{
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    color: 'primary.main',
                  }}
                />
              )}
            </Box>
            <Typography
              variant="caption"
              color={isPending ? 'text.disabled' : 'text.secondary'}
              sx={{
                fontSize: '0.65rem',
                maxWidth: 56,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              {isPending ? 'Pending…' : displayName}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
