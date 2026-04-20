'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { useSession } from 'next-auth/react';
import {
  alpha,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  Avatar,
  Typography,
  IconButton,
  Stack,
  Tooltip,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { DeleteEventMomentDocument, ReadEventMomentsDocument } from '@/data/graphql/query';
import { EventMomentType } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { differenceInSeconds } from 'date-fns';
import type { ReadEventMomentsQuery } from '@/data/graphql/types/graphql';
import { useChatRealtime } from '@/hooks';
import { MessageComposer } from '@/components/messages/MessageComposer';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import Hls from 'hls.js';

type MomentEventShape = { event?: { slug: string; title: string } | null };
type Moment = ReadEventMomentsQuery['readEventMoments']['items'][number] & MomentEventShape;

interface EventMomentViewerProps {
  moments: Moment[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  /** IDs that may delete any moment (organizer IDs) */
  organizerIds: string[];
  onDeleted?: (momentId: string) => void;
  /** Optional fallback event context shown when the moment doesn't carry its own event field */
  eventContext?: { slug: string; title: string };
}

const STORY_DURATION_MS = 5000;

/** Tailwind content color tokens → CSS values. Intentional content colors stored in the DB;
 *  must remain specific hues regardless of theme mode. */
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

const DEFAULT_BG = 'background.default';

function resolveBg(token?: string | null): string {
  if (!token) return DEFAULT_BG;
  return BG_PALETTE[token] ?? DEFAULT_BG;
}

export default function EventMomentViewer({
  moments,
  startIndex,
  open,
  onClose,
  organizerIds,
  onDeleted,
  eventContext,
}: EventMomentViewerProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const viewerUserId = session?.user?.userId;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const videoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    setVideoNode(el);
  }, []);
  const elapsedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const momentTypeRef = useRef<string | undefined>(undefined);
  const mediaLoadedRef = useRef(false);
  const currentEventIdRef = useRef<string | undefined>(undefined);

  // Swipe-down-to-close
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragYRef = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { sendChatMessage, isConnected } = useChatRealtime({ enabled: Boolean(viewerUserId) });

  const [deleteMoment] = useMutation(DeleteEventMomentDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const moment = moments[currentIndex];
  momentTypeRef.current = moment?.type;
  currentEventIdRef.current = moment?.eventId;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= moments.length) {
        onClose();
        return;
      }
      elapsedRef.current = 0;
      setCurrentIndex(index);
      setProgress(0);
      mediaLoadedRef.current = false;
      setMediaLoaded(false);
      setMediaError(false);
    },
    [moments.length, onClose],
  );

  const handleReply = useCallback(
    (message: string): boolean => {
      const current = moments[currentIndex];
      if (!current?.authorId) return false;
      return sendChatMessage(current.authorId, message, {
        replyToMomentId: current.momentId,
        replyToMomentCaption: current.caption ?? undefined,
        replyToMomentType: current.type,
      });
    },
    [moments, currentIndex, sendChatMessage],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
    isDraggingRef.current = false;
    setPaused(true);
  }, []);

  const handleSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - touchStartYRef.current;
    const dx = e.touches[0].clientX - touchStartXRef.current;
    // Lock into vertical drag mode once clearly swiping downward
    if (!isDraggingRef.current) {
      if (dy > 10 && dy > Math.abs(dx)) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }
      return;
    }
    if (dy > 0) {
      dragYRef.current = dy;
      setDragY(dy);
    }
  }, []);

  const handleSwipeTouchEnd = useCallback(() => {
    setPaused(false);
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    const finalDragY = dragYRef.current;
    dragYRef.current = 0;
    setDragY(0);
    if (finalDragY > 120) {
      onClose();
    }
  }, [onClose]);

  const isVideoMoment = moment?.type?.toLowerCase() === 'video';

  useEffect(() => {
    if (!open || paused) return;

    let lastTime = performance.now();

    const tick = (now: number) => {
      if (momentTypeRef.current?.toLowerCase() === 'video') {
        rafRef.current = null;
        return;
      }

      if (momentTypeRef.current?.toLowerCase() === 'image' && !mediaLoadedRef.current) {
        lastTime = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      elapsedRef.current += now - lastTime;
      lastTime = now;
      const pct = Math.min((elapsedRef.current / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (elapsedRef.current >= STORY_DURATION_MS) {
        goNext();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, currentIndex, paused, goNext]);

  // Video progress — sync progress bar with video currentTime
  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  }, []);

  useEffect(() => {
    if (!videoNode) return;
    const url = moment?.type?.toLowerCase() === 'video' ? moment?.mediaUrl : undefined;
    if (!url) return;

    let hls: Hls | undefined;

    if (url.endsWith('.m3u8') && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(videoNode);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          setMediaLoaded(true); // hide spinner
          setMediaError(true);
          hls?.destroy();
        }
      });
    } else {
      // Safari natively supports .m3u8; also handles plain .mp4 for both browsers.
      videoNode.src = url;
    }

    return () => {
      hls?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoNode, moment?.mediaUrl]);

  // Keep video play/pause in sync with the viewer's paused state (tap-to-pause)
  useEffect(() => {
    const video = videoRef.current;
    if (!isVideoMoment || !video) return;
    if (paused) {
      video.pause();
    } else {
      void video.play().catch(() => {});
    }
  }, [paused, isVideoMoment]);

  // Reset when opened or start index changes
  useEffect(() => {
    if (open) {
      elapsedRef.current = 0;
      setCurrentIndex(startIndex);
      setProgress(0);
      mediaLoadedRef.current = false;
      setMediaLoaded(false);
      setMediaError(false);
      dragYRef.current = 0;
      setDragY(0);
      setIsDragging(false);
      isDraggingRef.current = false;
      setContextMenuOpen(false);
      setConfirmDeleteOpen(false);
    }
  }, [open, startIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, goNext, goPrev, onClose]);

  const handleDelete = async () => {
    if (!moment) return;
    const { momentId, eventId } = moment;
    setConfirmDeleteOpen(false);
    try {
      await deleteMoment({
        variables: { momentId },
        refetchQueries: [
          {
            query: ReadEventMomentsDocument,
            variables: { eventId, limit: 50 },
            context: { headers: getAuthHeader(token) },
          },
        ],
      });
      onDeleted?.(momentId);
      // After removal the moments array passed from parent will shrink.
      // Stay at the same index if another moment fills that slot; otherwise go back.
      // goTo() handles closing the viewer when the list becomes empty.
      const nextMoments = moments.filter((m) => m.momentId !== momentId);
      if (nextMoments.length === 0) {
        onClose();
      } else {
        const safeIndex = Math.min(currentIndex, nextMoments.length - 1);
        elapsedRef.current = 0;
        setCurrentIndex(safeIndex);
        setProgress(0);
      }
    } catch {
      // silently ignore — moment may have already expired
    }
  };

  if (!open || !moment) return null;

  const author = moment.author;
  const displayName =
    author?.given_name && author?.family_name
      ? `${author.given_name} ${author.family_name}`
      : (author?.username ?? 'User');
  const avatarSrc = author?.profile_picture ?? undefined;
  const initials = author?.given_name?.[0]?.toUpperCase() ?? author?.username?.[0]?.toUpperCase() ?? '?';

  const canDelete =
    viewerUserId === moment.authorId || (viewerUserId !== undefined && organizerIds.includes(viewerUserId));

  const timeAgo = (() => {
    const secs = Math.max(0, differenceInSeconds(new Date(), new Date(moment.createdAt)));
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  })();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'common.black',
            m: 0,
            display: 'flex',
            flexDirection: 'column',
            transform: `translateY(${dragY}px)`,
            opacity: Math.max(0, 1 - dragY / 400),
            transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'common.black',
          overflow: 'hidden',
        }}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) handleSwipeTouchStart(e);
        }}
        onTouchMove={(e) => {
          if (isDraggingRef.current) handleSwipeTouchMove(e);
        }}
        onTouchEnd={(e) => {
          if (isDraggingRef.current) handleSwipeTouchEnd();
        }}
      >
        {/* Progress bars */}
        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10 }}>
          {moments.map((_, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: 3,
                bgcolor: (theme) => alpha(theme.palette.common.white, 0.35),
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  bgcolor: 'common.white',
                  borderRadius: 1,
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                  transition: i === currentIndex ? 'none' : undefined,
                }}
              />
            </Box>
          ))}
        </Stack>

        {/* Header — author info */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            position: 'absolute',
            top: 28,
            left: 16,
            right: 56,
            zIndex: 10,
          }}
        >
          <Avatar
            src={avatarSrc}
            alt={displayName}
            sx={{ width: 36, height: 36, border: '2px solid', borderColor: 'common.white', flexShrink: 0 }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component={author?.username ? Link : 'span'}
              href={author?.username ? ROUTES.USERS.USER(author.username) : undefined}
              onClick={author?.username ? onClose : undefined}
              variant="body2"
              fontWeight={700}
              color="common.white"
              sx={{
                lineHeight: 1.2,
                display: 'block',
                textDecoration: 'none',
                '&:hover': author?.username ? { textDecoration: 'underline' } : undefined,
              }}
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: (theme) => alpha(theme.palette.common.white, 0.7), mt: 0.25, display: 'block' }}
            >
              {timeAgo}
            </Typography>
          </Box>
        </Stack>

        {/* Actions: mute · delete · more · close */}
        <Stack
          direction="row"
          alignItems="center"
          sx={{ position: 'absolute', top: 20, right: 8, zIndex: 10 }}
          spacing={0}
        >
          {isVideoMoment && (
            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton onClick={handleToggleMute} sx={{ color: 'common.white' }} size="small">
                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete moment">
              <IconButton
                onClick={() => {
                  setPaused(true);
                  setConfirmDeleteOpen(true);
                }}
                sx={{ color: 'common.white' }}
                size="small"
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="More options">
            <IconButton
              aria-label="More options"
              onClick={() => {
                setPaused(true);
                setContextMenuOpen(true);
              }}
              sx={{ color: 'common.white' }}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ color: 'common.white', p: '7px' }} size="small">
            <CloseIcon sx={{ fontSize: '1.35rem' }} />
          </IconButton>
        </Stack>

        {/* Moment content — keyed on momentId so React fully remounts on every transition */}
        <Box
          key={moment.momentId}
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: 480, md: 560 },
            height: '100%',
            maxHeight: { xs: '100%', sm: '90vh' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {moment.type === EventMomentType.Text && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                maxWidth: { xs: '100%', sm: 480, md: 560 },
                maxHeight: { xs: '100%', sm: '90vh' },
                bgcolor: resolveBg(moment.background),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: { xs: 0, sm: 3 },
                p: 4,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: 'common.white',
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.4,
                  textShadow: (theme) => `0 2px 8px ${alpha(theme.palette.common.black, 0.4)}`,
                }}
              >
                {moment.caption}
              </Typography>
            </Box>
          )}

          {moment.type === EventMomentType.Image && moment.mediaUrl && (
            <>
              {!mediaLoaded && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <CircularProgress size={40} sx={{ color: (theme) => alpha(theme.palette.common.white, 0.8) }} />
                </Box>
              )}
              <Box
                component="img"
                src={moment.mediaUrl}
                alt={moment.caption ?? 'Event moment'}
                onLoad={() => {
                  mediaLoadedRef.current = true;
                  setMediaLoaded(true);
                }}
                onError={() => {
                  // Image failed to load (404, CORS, etc.) — unfreeze the timer so the
                  // viewer can still advance rather than stalling indefinitely.
                  mediaLoadedRef.current = true;
                  setMediaLoaded(true);
                  setMediaError(true);
                }}
                sx={{
                  width: '100%',
                  height: '100%',
                  maxWidth: { xs: '100%', sm: 480, md: 560 },
                  maxHeight: { xs: '100%', sm: '90vh' },
                  objectFit: 'contain',
                  borderRadius: { xs: 0, sm: 2 },
                  opacity: mediaLoaded ? 1 : 0,
                  transition: 'opacity 0.25s ease',
                }}
              />
            </>
          )}

          {moment.type === EventMomentType.Video && moment.mediaUrl && (
            <>
              {!mediaLoaded && !mediaError && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <CircularProgress size={40} sx={{ color: (theme) => alpha(theme.palette.common.white, 0.8) }} />
                </Box>
              )}
              {mediaError && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: (theme) => alpha(theme.palette.common.white, 0.7) }}>
                    Video unavailable
                  </Typography>
                </Box>
              )}
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  maxWidth: { xs: '100%', sm: 480, md: 560 },
                  maxHeight: { xs: '100%', sm: '90vh' },
                  overflow: 'hidden',
                  borderRadius: { xs: 0, sm: 2 },
                }}
              >
                <video
                  ref={videoRefCallback}
                  poster={moment.thumbnailUrl ?? undefined}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  onCanPlay={() => setMediaLoaded(true)}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={goNext}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: mediaLoaded ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                  }}
                />
              </Box>
            </>
          )}
        </Box>

        {/* Tap zones / arrow navigation */}
        <Box
          onClick={goPrev}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '40%',
            zIndex: 5,
            cursor: currentIndex > 0 ? 'pointer' : 'default',
          }}
        />
        <Box
          onClick={goNext}
          sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', zIndex: 5, cursor: 'pointer' }}
        />

        {/* Visible chevrons on desktop */}
        {currentIndex > 0 && (
          <IconButton
            onClick={goPrev}
            sx={{
              position: 'absolute',
              left: 8,
              color: 'common.white',
              bgcolor: (theme) => alpha(theme.palette.common.black, 0.35),
              zIndex: 6,
              display: { xs: 'none', sm: 'flex' },
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.common.black, 0.55) },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
        {currentIndex < moments.length - 1 && (
          <IconButton
            onClick={goNext}
            sx={{
              position: 'absolute',
              right: 8,
              color: 'common.white',
              bgcolor: (theme) => alpha(theme.palette.common.black, 0.35),
              zIndex: 6,
              display: { xs: 'none', sm: 'flex' },
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.common.black, 0.55) },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      {/* Reply input — sits below the video as a real footer row, not overlaid */}
      {viewerUserId && viewerUserId !== moment.authorId && moment.authorId ? (
        <Box
          sx={{
            width: '100%',
            bgcolor: 'common.black',
            px: 2,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: (theme) => alpha(theme.palette.common.white, 0.12),
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <Box sx={{ width: '100%', maxWidth: { sm: 480, md: 560 } }}>
            {moment.type !== EventMomentType.Text && moment.caption && (
              <Typography
                variant="body2"
                sx={{
                  color: 'common.white',
                  mb: 1,
                  px: 0.5,
                }}
              >
                {moment.caption}
              </Typography>
            )}
            <MessageComposer
              variant="overlay"
              onSend={handleReply}
              isConnected={isConnected}
              targetUserId={moment.authorId}
              placeholder={`Reply to ${displayName}…`}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onAfterSend={() => {
                setReplySent(true);
                setTimeout(() => setReplySent(false), 2500);
              }}
            />
            {replySent && (
              <Typography
                variant="caption"
                sx={{
                  mt: 0.75,
                  display: 'block',
                  textAlign: 'center',
                  color: (theme) => alpha(theme.palette.common.white, 0.85),
                }}
              >
                Message sent
              </Typography>
            )}
          </Box>
        </Box>
      ) : moment.type !== EventMomentType.Text && moment.caption ? (
        <Box
          sx={{
            width: '100%',
            bgcolor: 'common.black',
            px: 2,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: (theme) => alpha(theme.palette.common.white, 0.12),
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'common.white', width: '100%', maxWidth: { sm: 480, md: 560 }, px: 0.5 }}
          >
            {moment.caption}
          </Typography>
        </Box>
      ) : null}

      {/* Context menu popup */}
      {(() => {
        const resolvedEvent = moment.event ?? eventContext;
        const closeMenu = () => {
          setContextMenuOpen(false);
          setPaused(false);
        };
        return (
          <Dialog
            open={contextMenuOpen}
            onClose={closeMenu}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: 3,
                  minWidth: 280,
                  maxWidth: 360,
                  overflow: 'hidden',
                },
              },
            }}
          >
            <List disablePadding sx={{ pt: 0.5, pb: 1 }}>
              {author?.username && (
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href={ROUTES.USERS.USER(author.username)}
                    onClick={() => {
                      setContextMenuOpen(false);
                      onClose();
                    }}
                    sx={{ px: 3, py: 1.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 44 }}>
                      <PersonOutlineIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="View profile"
                      secondary={`@${author.username}`}
                      slotProps={{ primary: { fontWeight: 600 } }}
                    />
                  </ListItemButton>
                </ListItem>
              )}

              <Divider sx={{ my: 0.5 }} />

              {resolvedEvent?.slug && (
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href={ROUTES.EVENTS.EVENT(resolvedEvent.slug)}
                    onClick={() => {
                      setContextMenuOpen(false);
                      onClose();
                    }}
                    sx={{ px: 3, py: 1.25 }}
                  >
                    <ListItemIcon sx={{ minWidth: 44 }}>
                      <EventOutlinedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="View event"
                      secondary={resolvedEvent.title}
                      slotProps={{ primary: { fontWeight: 600 } }}
                    />
                  </ListItemButton>
                </ListItem>
              )}

              <Divider sx={{ my: 0.5 }} />

              <ListItem disablePadding>
                <ListItemButton onClick={closeMenu} sx={{ px: 3, py: 1.25 }}>
                  <ListItemIcon sx={{ minWidth: 44 }}>
                    <FlagOutlinedIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Report"
                    secondary="Flag inappropriate content"
                    slotProps={{ primary: { fontWeight: 600, color: 'error.main' } }}
                  />
                </ListItemButton>
              </ListItem>
            </List>

            <Divider sx={{ my: 0.5 }} />

            <DialogActions sx={{ px: 2, pb: 2 }}>
              <Button onClick={closeMenu} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Cancel
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setPaused(false);
        }}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this moment?</DialogTitle>
        <DialogContent>
          <DialogContentText>This moment will be permanently removed. This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setConfirmDeleteOpen(false);
              setPaused(false);
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
