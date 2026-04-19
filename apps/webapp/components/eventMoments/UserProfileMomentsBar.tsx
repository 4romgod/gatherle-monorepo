'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Avatar, Box, ButtonBase, Container, Divider, Skeleton, Tooltip, Typography } from '@mui/material';
import { ReadUserEventMomentsDocument } from '@/data/graphql/query';
import { EventMomentState } from '@/data/graphql/types/graphql';
import type { ReadUserEventMomentsQuery } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import EventMomentViewer from './EventMomentViewer';

type Moment = ReadUserEventMomentsQuery['readUserEventMoments'][number];

interface Props {
  userId: string;
  /** Events to display moments for */
  events: { eventId: string; title: string }[];
  token: string | undefined;
  isOwnProfile: boolean;
}

interface EventMomentsGroupProps {
  userId: string;
  eventId: string;
  eventName: string;
  token: string | undefined;
  isOwnProfile: boolean;
}

/** Loads and renders one event bubble in the bar. Returns null when no ready moments exist. */
function EventMomentsBubble({ userId, eventId, eventName, token, isOwnProfile }: EventMomentsGroupProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMoments, setViewerMoments] = useState<Moment[]>([]);

  const { data, loading } = useQuery(ReadUserEventMomentsDocument, {
    variables: { userId, eventId },
    context: token ? { headers: getAuthHeader(token) } : undefined,
    skip: !token,
    fetchPolicy: 'cache-and-network',
  });

  const moments: Moment[] = (data?.readUserEventMoments ?? []).filter((m) => m.state === EventMomentState.Ready);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
        <Skeleton variant="circular" width={56} height={56} />
        <Skeleton variant="text" width={44} height={12} />
      </Box>
    );
  }

  if (moments.length === 0) return null;

  const first = moments[0];
  const author = first.author;
  const displayName = author?.given_name ?? author?.username ?? 'User';
  const avatarSrc = author?.profile_picture ?? undefined;
  const initials = author?.given_name?.[0]?.toUpperCase() ?? author?.username?.[0]?.toUpperCase() ?? '?';

  const openViewer = () => {
    setViewerMoments(moments);
    setViewerOpen(true);
  };

  return (
    <>
      <Tooltip title={eventName} placement="bottom" arrow>
        <ButtonBase
          onClick={openViewer}
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
              transition: 'transform 0.18s ease',
              '&:hover': { transform: 'scale(1.08)' },
            }}
          >
            <Avatar
              src={avatarSrc}
              alt={displayName}
              sx={{
                width: 56,
                height: 56,
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
              maxWidth: 60,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {eventName}
          </Typography>
        </ButtonBase>
      </Tooltip>

      <EventMomentViewer
        moments={viewerMoments}
        startIndex={0}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        organizerIds={isOwnProfile ? [userId] : []}
        onDeleted={(momentId) => setViewerMoments((prev) => prev.filter((m) => m.momentId !== momentId))}
      />
    </>
  );
}

export default function UserProfileMomentsBar({ userId, events, token, isOwnProfile }: Props) {
  if (!token || events.length === 0) return null;

  return (
    <Box>
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1.5, md: 2 },
            overflowX: 'auto',
            py: 1.25,
            px: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {events.map(({ eventId, title: name }) => (
            <EventMomentsBubble
              key={eventId}
              userId={userId}
              eventId={eventId}
              eventName={name}
              token={token}
              isOwnProfile={isOwnProfile}
            />
          ))}
        </Box>
      </Container>
      <Divider />
    </Box>
  );
}
