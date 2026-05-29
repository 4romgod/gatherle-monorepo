'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useMutation } from '@apollo/client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  alpha,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Hls from 'hls.js';
import { differenceInSeconds } from 'date-fns';
import { DeleteEventMomentDocument } from '@/data/graphql/query';
import { EventMomentImageDisplayMode, EventMomentType, type GetMomentsFeedQuery } from '@/data/graphql/types/graphql';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { useChatRealtime } from '@/hooks';
import { useAppContext } from '@/hooks/useAppContext';
import { ROUTES } from '@/lib/constants';
import { extractApolloErrorMessage } from '@/lib/utils/apollo-error';
import { getAuthHeader } from '@/lib/utils/auth';

type Moment = GetMomentsFeedQuery['readMomentsFeed']['items'][number];

const STORY_DURATION_MS = 5000;
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

function formatRelativeAge(createdAt: string): string {
  const secs = Math.max(0, differenceInSeconds(new Date(), new Date(createdAt)));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function getDisplayName(moment: Moment): string {
  const author = moment.author;
  return (
    [author?.given_name, author?.family_name].filter(Boolean).join(' ').trim() || author?.username || 'Gatherle member'
  );
}

function getMomentDurationMs(moment: Moment): number {
  if (moment.type === EventMomentType.Video && moment.durationSeconds) {
    return Math.max(moment.durationSeconds * 1000, 1000);
  }

  return STORY_DURATION_MS;
}

interface MomentFeedSlideProps {
  active: boolean;
  moment: Moment;
  onDeleted?: (momentId: string) => void;
}

export default function MomentFeedSlide({ active, moment, onDeleted }: MomentFeedSlideProps) {
  const { data: session } = useSession();
  const { setToastProps } = useAppContext();
  const token = session?.user?.token;
  const viewerUserId = session?.user?.userId;
  const [isMuted, setIsMuted] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(moment.type === EventMomentType.Text);
  const [mediaError, setMediaError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replySent, setReplySent] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoNode(node);
  }, []);
  const hlsRef = useRef<Hls | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const replySentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepPausedOnMenuCloseRef = useRef(false);

  const { isConnected, sendChatMessage } = useChatRealtime({ enabled: Boolean(viewerUserId) });
  const [deleteMoment] = useMutation(DeleteEventMomentDocument, {
    context: token ? { headers: getAuthHeader(token) } : undefined,
  });

  const displayName = getDisplayName(moment);
  const authorUsername = moment.author?.username ?? undefined;
  const authorUserId = moment.author?.userId ?? moment.authorId;
  const avatarSrc = moment.author?.profile_picture ?? undefined;
  const initials = moment.author?.given_name?.[0]?.toUpperCase() ?? authorUsername?.[0]?.toUpperCase() ?? '?';
  const showReplyComposer = Boolean(viewerUserId && authorUserId && authorUserId !== viewerUserId);
  const canDelete = Boolean(viewerUserId && viewerUserId === moment.authorId);
  const isVideoMoment = moment.type === EventMomentType.Video;
  const supportsMedia = moment.type === EventMomentType.Image || moment.type === EventMomentType.Video;
  const momentDurationMs = getMomentDurationMs(moment);
  const videoResetThresholdSeconds = Math.max((moment.durationSeconds ?? 0) - 0.1, 0.1);
  const resolvedBackground =
    moment.type === EventMomentType.Text ? resolveMomentBackground(moment.background) : '#000000';
  const captionBottomOffset = showReplyComposer ? 86 : 28;
  const targetUserId = showReplyComposer ? authorUserId : undefined;
  const desktopFrameSx = {
    width: '100%',
    height: '100%',
    maxWidth: { xs: '100%', sm: 480, md: 560 },
    maxHeight: { xs: '100%', sm: '90vh' },
    borderRadius: { xs: 0, sm: 2 },
    overflow: 'hidden',
    position: 'relative',
  } as const;

  useEffect(() => {
    setIsMuted(true);
    setMediaLoaded(moment.type === EventMomentType.Text);
    setMediaError(false);
    setPaused(false);
    setProgress(0);
    setReplySent(false);
    setMenuAnchorEl(null);
    setConfirmDeleteOpen(false);
    keepPausedOnMenuCloseRef.current = false;
    elapsedRef.current = 0;
  }, [moment.background, moment.mediaUrl, moment.momentId, moment.type]);

  useEffect(() => {
    return () => {
      if (replySentTimeoutRef.current) {
        clearTimeout(replySentTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (moment.type !== EventMomentType.Video) {
      return;
    }

    const video = videoNode;
    const url = moment.mediaUrl;

    if (!video || !url) {
      return;
    }

    hlsRef.current?.destroy();
    hlsRef.current = null;
    video.removeAttribute('src');
    video.load();

    if (url.endsWith('.m3u8') && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setMediaLoaded(true);
          setMediaError(true);
          hls.destroy();
          hlsRef.current = null;
        }
      });
    } else {
      video.src = url;
      video.load();
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [moment.mediaUrl, moment.type, videoNode]);

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }

      elapsedRef.current = 0;
      setProgress(0);
      setMenuAnchorEl(null);
      setConfirmDeleteOpen(false);
      keepPausedOnMenuCloseRef.current = false;
      setPaused(false);
      return;
    }

    if (isVideoMoment) {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      if (!mediaLoaded || mediaError || paused) {
        video.pause();
        return;
      }

      if (video.currentTime >= videoResetThresholdSeconds) {
        video.currentTime = 0;
        setProgress(0);
      }

      void video.play().catch(() => {});
      return;
    }

    if (!mediaLoaded || paused) {
      return;
    }

    let lastFrameAt = performance.now();

    const tick = (now: number) => {
      elapsedRef.current += now - lastFrameAt;
      lastFrameAt = now;
      setProgress(Math.min(100, (elapsedRef.current / momentDurationMs) * 100));
      if (elapsedRef.current < momentDurationMs) {
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
  }, [active, isVideoMoment, mediaError, mediaLoaded, momentDurationMs, paused, videoResetThresholdSeconds]);

  useEffect(() => {
    if (moment.type !== EventMomentType.Video || !videoRef.current) {
      return;
    }

    videoRef.current.muted = isMuted;
  }, [isMuted, moment.type]);

  const closeMenu = useCallback(() => {
    setMenuAnchorEl(null);
    if (keepPausedOnMenuCloseRef.current || confirmDeleteOpen) {
      keepPausedOnMenuCloseRef.current = false;
      return;
    }

    setPaused(false);
  }, [confirmDeleteOpen]);

  const handleSendReply = useCallback(
    (message: string) => {
      if (!targetUserId) {
        return false;
      }

      return sendChatMessage(targetUserId, message, {
        replyToMomentId: moment.momentId,
        replyToMomentCaption: moment.caption ?? undefined,
        replyToMomentType: moment.type,
      });
    },
    [moment.caption, moment.momentId, moment.type, sendChatMessage, targetUserId],
  );

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setPaused(true);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleDeleteDialogOpen = useCallback(() => {
    keepPausedOnMenuCloseRef.current = true;
    setConfirmDeleteOpen(true);
    setMenuAnchorEl(null);
  }, []);

  const handleDeleteDialogClose = useCallback(() => {
    keepPausedOnMenuCloseRef.current = false;
    setConfirmDeleteOpen(false);
    setMenuAnchorEl(null);
    setPaused(false);
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMoment({ variables: { momentId: moment.momentId } });
      keepPausedOnMenuCloseRef.current = false;
      setConfirmDeleteOpen(false);
      setMenuAnchorEl(null);
      onDeleted?.(moment.momentId);
    } catch (error) {
      keepPausedOnMenuCloseRef.current = false;
      setConfirmDeleteOpen(false);
      setMenuAnchorEl(null);
      setToastProps((previous) => ({
        ...previous,
        open: true,
        severity: 'error',
        message: extractApolloErrorMessage(error, 'Unable to delete this moment. Please try again.'),
      }));
    } finally {
      setPaused(false);
    }
  }, [deleteMoment, moment.momentId, onDeleted, setToastProps]);

  return (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        scrollSnapAlign: 'start',
        overflow: 'hidden',
        bgcolor: resolvedBackground,
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(3,7,18,0.18) 0%, rgba(3,7,18,0) 24%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            background: 'linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.72) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        <Box sx={{ position: 'absolute', top: 0, left: 12, right: 12, zIndex: 5, pt: 1.5 }}>
          <Box sx={{ height: 2.5, borderRadius: 999, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.28)' }}>
            <Box
              sx={{
                width: `${Math.max(progress, 0)}%`,
                height: '100%',
                borderRadius: 999,
                bgcolor: 'common.white',
                transition: paused ? 'none' : 'width 120ms linear',
              }}
            />
          </Box>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{
            position: 'absolute',
            top: 22,
            left: 16,
            right: 16,
            zIndex: 6,
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            component={authorUsername ? Link : 'div'}
            href={authorUsername ? ROUTES.USERS.USER(authorUsername) : undefined}
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              minWidth: 0,
              flex: 1,
            }}
          >
            <Avatar
              src={avatarSrc}
              alt={displayName}
              sx={{ width: 42, height: 42, border: '2px solid', borderColor: 'common.white', flexShrink: 0 }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography color="common.white" fontWeight={800} noWrap>
                {displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: (theme) => alpha(theme.palette.common.white, 0.74) }}>
                {formatRelativeAge(moment.createdAt)}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            {isVideoMoment ? (
              <IconButton onClick={() => setIsMuted((current) => !current)} sx={{ color: 'common.white' }} size="small">
                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
            ) : null}
            <IconButton onClick={handleMenuOpen} sx={{ color: 'common.white' }} size="small">
              <MoreHorizIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {moment.type === EventMomentType.Text ? (
            <Box
              sx={{
                ...desktopFrameSx,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 4,
                bgcolor: resolvedBackground,
              }}
            >
              <Typography
                color="common.white"
                fontWeight={900}
                sx={{ fontSize: { xs: 30, md: 36 }, lineHeight: 1.2, textAlign: 'center', maxWidth: 520 }}
              >
                {moment.caption || 'Moment'}
              </Typography>
            </Box>
          ) : null}

          {moment.type === EventMomentType.Image && moment.mediaUrl ? (
            <>
              {!mediaLoaded && !mediaError ? (
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
                  <CircularProgress size={26} sx={{ color: 'common.white' }} />
                </Box>
              ) : null}

              {(moment.imageDisplayMode ?? EventMomentImageDisplayMode.Fit) === EventMomentImageDisplayMode.Fit ? (
                <Box
                  sx={{
                    ...desktopFrameSx,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box
                    component="img"
                    src={moment.mediaUrl}
                    alt=""
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'blur(24px)',
                      transform: 'scale(1.08)',
                      opacity: mediaLoaded ? 0.66 : 0,
                      transition: 'opacity 0.25s ease',
                    }}
                  />
                  <Box
                    component="img"
                    src={moment.mediaUrl}
                    alt={moment.caption ?? 'Moment'}
                    onLoad={() => setMediaLoaded(true)}
                    onError={() => {
                      setMediaLoaded(true);
                      setMediaError(true);
                    }}
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      opacity: mediaLoaded ? 1 : 0,
                      transition: 'opacity 0.25s ease',
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    ...desktopFrameSx,
                  }}
                >
                  <Box
                    component="img"
                    src={moment.mediaUrl}
                    alt={moment.caption ?? 'Moment'}
                    onLoad={() => setMediaLoaded(true)}
                    onError={() => {
                      setMediaLoaded(true);
                      setMediaError(true);
                    }}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: mediaLoaded ? 1 : 0,
                      transition: 'opacity 0.25s ease',
                    }}
                  />
                </Box>
              )}
            </>
          ) : null}

          {moment.type === EventMomentType.Video && moment.mediaUrl ? (
            <>
              {!mediaLoaded && !mediaError ? (
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
                  <CircularProgress size={26} sx={{ color: 'common.white' }} />
                </Box>
              ) : null}
              <Box sx={desktopFrameSx}>
                <video
                  ref={videoRefCallback}
                  poster={moment.thumbnailUrl ?? undefined}
                  muted={isMuted}
                  playsInline
                  autoPlay={active}
                  onCanPlay={() => setMediaLoaded(true)}
                  onError={() => {
                    setMediaLoaded(true);
                    setMediaError(true);
                  }}
                  onTimeUpdate={() => {
                    const video = videoRef.current;
                    if (!video || !video.duration || !active) {
                      return;
                    }

                    setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
                  }}
                  onEnded={() => {
                    setProgress(100);
                    videoRef.current?.pause();
                  }}
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
          ) : null}

          {!supportsMedia && !moment.caption ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography color="common.white" fontWeight={800}>
                Moment
              </Typography>
            </Box>
          ) : null}

          {mediaError ? (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                bgcolor: 'rgba(3,7,18,0.35)',
              }}
            >
              <Stack spacing={1} alignItems="center">
                <ImageOutlinedIcon sx={{ color: 'common.white', fontSize: 36 }} />
                <Typography color="common.white" fontWeight={700}>
                  This moment could not be displayed.
                </Typography>
              </Stack>
            </Box>
          ) : null}
        </Box>

        {supportsMedia && moment.caption ? (
          <Typography
            sx={{
              position: 'absolute',
              left: 18,
              right: 18,
              bottom: captionBottomOffset,
              zIndex: 5,
              color: 'common.white',
              fontSize: { xs: '1rem', sm: '1.05rem' },
              fontWeight: 700,
              lineHeight: 1.45,
            }}
          >
            {moment.caption}
          </Typography>
        ) : null}

        {showReplyComposer ? (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 6,
              px: 2,
              pb: { xs: 0.5, sm: 2 },
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 480, md: 560 } }}>
              <MessageComposer
                isConnected={isConnected}
                onSend={handleSendReply}
                placeholder={`Reply...`}
                targetUserId={targetUserId}
                variant="overlay"
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onAfterSend={() => {
                  setReplySent(true);
                  if (replySentTimeoutRef.current) {
                    clearTimeout(replySentTimeoutRef.current);
                  }
                  replySentTimeoutRef.current = setTimeout(() => setReplySent(false), 2200);
                }}
              />
              {replySent ? (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.75,
                    display: 'block',
                    textAlign: 'center',
                    color: (theme) => alpha(theme.palette.common.white, 0.84),
                  }}
                >
                  Reply sent
                </Typography>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              borderRadius: 3,
              overflow: 'hidden',
            },
          },
        }}
      >
        {authorUsername ? (
          <MenuItem
            component={Link}
            href={ROUTES.USERS.USER(authorUsername)}
            onClick={() => {
              setMenuAnchorEl(null);
              setPaused(false);
            }}
          >
            <PersonOutlineIcon color="primary" sx={{ mr: 1.5 }} />
            <Box>
              <Typography fontWeight={600}>View profile</Typography>
              <Typography variant="caption" color="text.secondary">
                @{authorUsername}
              </Typography>
            </Box>
          </MenuItem>
        ) : null}

        {moment.event?.slug ? (
          <MenuItem
            component={Link}
            href={ROUTES.EVENTS.EVENT(moment.event.slug)}
            onClick={() => {
              setMenuAnchorEl(null);
              setPaused(false);
            }}
          >
            <EventOutlinedIcon color="primary" sx={{ mr: 1.5 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={600}>View event</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {moment.event.title}
              </Typography>
            </Box>
          </MenuItem>
        ) : null}

        {canDelete ? (
          <MenuItem onClick={handleDeleteDialogOpen}>
            <DeleteOutlineIcon color="error" sx={{ mr: 1.5 }} />
            <Typography color="error.main" fontWeight={600}>
              Delete moment
            </Typography>
          </MenuItem>
        ) : null}
      </Menu>

      <Dialog open={confirmDeleteOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete moment?</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
