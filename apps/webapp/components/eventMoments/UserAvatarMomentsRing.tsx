'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { Avatar, Box, ButtonBase } from '@mui/material';
import { ReadUserEventMomentsDocument } from '@/data/graphql/query';
import { EventMomentState, type ReadUserEventMomentsQuery } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import EventMomentViewer from './EventMomentViewer';

type Moment = ReadUserEventMomentsQuery['readUserEventMoments'][number];

interface FetcherProps {
  userId: string;
  eventId: string;
  token: string;
  onLoaded: (eventId: string, moments: Moment[]) => void;
}

/**
 * Invisible component — fetches moments for one event and reports them to the parent.
 * Renders nothing; exists only to call a hook per event without violating the Rules of Hooks.
 */
function EventMomentsFetcher({ userId, eventId, token, onLoaded }: FetcherProps) {
  const { data } = useQuery(ReadUserEventMomentsDocument, {
    variables: { userId, eventId },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    const ready = (data?.readUserEventMoments ?? []).filter((m) => m.state === EventMomentState.Ready);
    onLoaded(eventId, ready);
  }, [data, eventId, onLoaded]);

  return null;
}

interface Props {
  userId: string;
  /** Pre-resolved avatar URL (or undefined for initials fallback). */
  avatarSrc: string | undefined;
  displayName: string;
  /** Events to check for active moments. */
  events: { eventId: string; title: string }[];
  token: string | undefined;
  isOwnProfile: boolean;
}

/**
 * Profile avatar that gains an Instagram-style gradient ring when the user has active moments.
 * Clicking the avatar (with ring) opens the full-screen moment viewer across all events.
 */
export default function UserAvatarMomentsRing({ userId, avatarSrc, displayName, events, token, isOwnProfile }: Props) {
  const [momentsByEvent, setMomentsByEvent] = useState<Map<string, Moment[]>>(new Map());
  const [viewerOpen, setViewerOpen] = useState(false);

  // Clear stale moments and close the viewer when the profile being viewed changes or
  // the session is lost (sign-out). Without this, a stale ring could remain visible
  // and the viewer could open with moments from the previous user/session.
  // Skip the initial mount — data is still being fetched then and nothing is stale yet.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setMomentsByEvent(new Map());
    setViewerOpen(false);
  }, [userId, token]);

  const handleMomentsLoaded = useCallback((eventId: string, moments: Moment[]) => {
    setMomentsByEvent((prev) => {
      const next = new Map(prev);
      next.set(eventId, moments);
      return next;
    });
  }, []);

  const allMoments = useMemo(() => Array.from(momentsByEvent.values()).flat(), [momentsByEvent]);
  // Gate on token so a signed-out visitor never sees a stale ring even before the
  // reset effect above fires.
  const hasActiveMoments = !!token && allMoments.length > 0;

  const avatarSizeSx = { width: { xs: 80, md: 96 }, height: { xs: 80, md: 96 } };

  return (
    <>
      {/* Invisible fetchers — one per event, no visible output */}
      {token &&
        events.map((e) => (
          <EventMomentsFetcher
            key={e.eventId}
            userId={userId}
            eventId={e.eventId}
            token={token}
            onLoaded={handleMomentsLoaded}
          />
        ))}

      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        {hasActiveMoments ? (
          <ButtonBase
            onClick={() => setViewerOpen(true)}
            sx={{ borderRadius: '50%', display: 'block' }}
            aria-label={`View ${displayName}'s moments`}
          >
            <Box
              sx={{
                p: '3px',
                borderRadius: '50%',
                background: (theme) => theme.palette.hero.gradient,
                transition: 'transform 0.18s ease',
                '&:hover': { transform: 'scale(1.05)' },
              }}
            >
              <Avatar
                src={avatarSrc}
                alt={displayName}
                sx={{
                  ...avatarSizeSx,
                  border: '3px solid',
                  borderColor: 'background.paper',
                }}
              />
            </Box>
          </ButtonBase>
        ) : (
          <Avatar
            src={avatarSrc}
            alt={displayName}
            sx={{
              ...avatarSizeSx,
              border: '3px solid',
              borderColor: 'divider',
            }}
          />
        )}
      </Box>

      {hasActiveMoments && (
        <EventMomentViewer
          moments={allMoments}
          startIndex={0}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          organizerIds={isOwnProfile ? [userId] : []}
          onDeleted={(momentId) =>
            setMomentsByEvent((prev) => {
              const next = new Map(prev);
              for (const [key, moments] of next) {
                next.set(
                  key,
                  moments.filter((m) => m.momentId !== momentId),
                );
              }
              return next;
            })
          }
        />
      )}
    </>
  );
}
