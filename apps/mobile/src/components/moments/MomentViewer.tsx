import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApolloClient, useLazyQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEventListener } from 'expo';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayer } from 'expo-video';
import type { EventMomentState } from '@data/graphql/types/graphql';
import { EventMomentType } from '@data/graphql/types/graphql';
import { GetEventsDocument } from '@data/graphql/query/Event/query';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { ChatComposer } from '@/components/messages/thread/ChatComposer';
import { useDeleteEventMoment } from '@/hooks/moments/useDeleteEventMoment';
import { useChatRealtime } from '@/hooks/messages/useChatRealtime';
import { getApolloAuthContext } from '@/lib/auth';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';
import { formatRelativeTime, getDisplayName } from '@/lib/events/formatters';
import { MOMENT_BACKGROUND_SWATCHES } from '@/lib/moments/constants';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

const STORY_DURATION_MS = 5000;
const SCREEN = Dimensions.get('window');
const SCREEN_WIDTH = SCREEN.width;
const SCREEN_HEIGHT = SCREEN.height;
const FOOTER_HEIGHT = 118;
const HEADER_ZONE_HEIGHT = 112;
const DISMISS_PAN_ACTIVATION_DISTANCE = 6;
const DISMISS_DRAG_THRESHOLD = 120;
const DISMISS_VELOCITY_THRESHOLD = 0.85;
const GROUP_SWIPE_DISTANCE = 70;
const GROUP_SWIPE_VELOCITY = 0.55;

type MomentLike = {
  author?: {
    family_name?: string | null;
    given_name?: string | null;
    userId?: string | null;
    profile_picture?: string | null;
    username?: string | null;
  } | null;
  authorId: string;
  background?: string | null;
  caption?: string | null;
  createdAt: string;
  durationSeconds?: number | null;
  event?: {
    eventId: string;
    slug?: string | null;
    title?: string | null;
  } | null;
  eventId?: string;
  mediaUrl?: string | null;
  momentId: string;
  state: EventMomentState;
  thumbnailUrl?: string | null;
  type: EventMomentType;
};

function resolveBackgroundColor(token?: string | null): string {
  return MOMENT_BACKGROUND_SWATCHES.find((swatch) => swatch.token === token)?.color ?? '#9333ea';
}

function getMomentDurationMs(moment: MomentLike): number {
  if (moment.type === EventMomentType.Video && moment.durationSeconds) {
    return Math.max(moment.durationSeconds * 1000, 1000);
  }

  return STORY_DURATION_MS;
}

export function MomentViewer({
  active = true,
  containerHeight,
  embedded = false,
  moments,
  hasNextGroup = false,
  hasPreviousGroup = false,
  onClose,
  onDeleted,
  onRequestNextGroup,
  onRequestPreviousGroup,
  open,
  showCloseButton = true,
  startIndex = 0,
}: {
  active?: boolean;
  containerHeight?: number;
  embedded?: boolean;
  hasNextGroup?: boolean;
  hasPreviousGroup?: boolean;
  moments: MomentLike[];
  onClose: () => void;
  onDeleted?: (momentId: string) => void;
  onRequestNextGroup?: () => boolean;
  onRequestPreviousGroup?: () => boolean;
  open: boolean;
  showCloseButton?: boolean;
  startIndex?: number;
}) {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, userId: viewerUserId } = useAppShell();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isMuted, setIsMuted] = useState(true);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isMomentReady, setMomentReady] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replySent, setReplySent] = useState(false);
  const elapsedRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  const currentMomentRef = useRef<MomentLike | null>(null);
  const groupTransitionRef = useRef(false);
  const pendingGroupDirectionRef = useRef<'next' | 'previous' | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const groupTranslateX = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const currentMoment = moments[currentIndex] ?? null;
  const groupKey = moments[0]?.authorId ?? moments[0]?.momentId ?? 'empty';
  const canInteractWithMoment = open && (!embedded || active);
  currentMomentRef.current = currentMoment;
  const displayName = useMemo(() => getDisplayName(currentMoment?.author), [currentMoment?.author]);
  const { isConnected, sendChatMessage } = useChatRealtime({
    enabled: Boolean(viewerUserId),
  });
  const apolloClient = useApolloClient();
  const { deleteMoment } = useDeleteEventMoment(authToken);
  const videoSource = useMemo(
    () =>
      currentMoment?.type === EventMomentType.Video && currentMoment.mediaUrl ? { uri: currentMoment.mediaUrl } : null,
    [currentMoment?.mediaUrl, currentMoment?.type],
  );
  const configureVideoPlayer = useCallback((player: VideoPlayer) => {
    player.loop = false;
    player.muted = true;
    player.timeUpdateEventInterval = 0.5;
  }, []);
  const videoPlayer = useVideoPlayer(videoSource, configureVideoPlayer);
  const [loadLinkedEvent] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    ...getApolloAuthContext(authToken),
  });
  useEventListener(videoPlayer, 'playToEnd', () => {
    const activeMoment = currentMomentRef.current;
    if (!canInteractWithMoment || !activeMoment || activeMoment.type !== EventMomentType.Video) {
      return;
    }

    if (currentIndex >= moments.length - 1) {
      if (embedded) {
        setProgress(1);
        return;
      }

      requestNextGroup();
      return;
    }

    goTo(currentIndex + 1);
  });

  useEventListener(videoPlayer, 'statusChange', (payload) => {
    const activeMoment = currentMomentRef.current;
    if (!canInteractWithMoment || !activeMoment || activeMoment.type !== EventMomentType.Video) {
      return;
    }

    if (payload.status === 'readyToPlay') {
      setMomentReady(true);
      setMediaError(false);
    }

    if (payload.error) {
      setMomentReady(true);
      setMediaError(true);
    }
  });

  useEventListener(videoPlayer, 'timeUpdate', (payload) => {
    const activeMoment = currentMomentRef.current;
    if (!canInteractWithMoment || !activeMoment || activeMoment.type !== EventMomentType.Video || !isMomentReady) {
      return;
    }

    const nextProgress = Math.min(1, (payload.currentTime * 1000) / getMomentDurationMs(activeMoment));
    if (Math.abs(nextProgress - progressRef.current) < 0.02 && nextProgress < 1) {
      return;
    }

    progressRef.current = nextProgress;
    setProgress(nextProgress);
  });

  const clearReplySentTimeout = () => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  };

  const animateResetPosition = useCallback(
    (resumePlayback: boolean) => {
      Animated.parallel([
        Animated.spring(translateY, {
          bounciness: 6,
          speed: 18,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(groupTranslateX, {
          bounciness: 0,
          speed: 18,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (resumePlayback) {
          setPaused(false);
        }
      });
    },
    [groupTranslateX, overlayOpacity, translateY],
  );

  const requestClose = useCallback(
    (afterClose?: () => void) => {
      if (embedded) {
        setMenuOpen(false);
        setPaused(false);
        onClose();
        afterClose?.();
        return;
      }

      if (closingRef.current) {
        return;
      }

      closingRef.current = true;
      clearReplySentTimeout();
      setMenuOpen(false);
      setPaused(true);

      Animated.parallel([
        Animated.timing(translateY, {
          duration: 220,
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          duration: 220,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          closingRef.current = false;
          return;
        }

        translateY.setValue(0);
        overlayOpacity.setValue(1);
        groupTranslateX.setValue(0);
        onClose();
        afterClose?.();
      });
    },
    [embedded, groupTranslateX, onClose, overlayOpacity, translateY],
  );

  const transitionToGroup = useCallback(
    (direction: 'next' | 'previous', changeGroup: () => boolean) => {
      if (embedded) {
        return changeGroup();
      }

      if (groupTransitionRef.current) {
        return true;
      }

      groupTransitionRef.current = true;
      pendingGroupDirectionRef.current = direction;
      clearReplySentTimeout();
      setMenuOpen(false);
      setPaused(true);

      Animated.timing(groupTranslateX, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
        toValue: direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          groupTransitionRef.current = false;
          pendingGroupDirectionRef.current = null;
          animateResetPosition(true);
          return;
        }

        const didChangeGroup = changeGroup();
        if (!didChangeGroup) {
          groupTransitionRef.current = false;
          pendingGroupDirectionRef.current = null;
          animateResetPosition(true);
        }
      });

      return true;
    },
    [animateResetPosition, embedded, groupTranslateX],
  );

  const requestNextGroup = useCallback(() => {
    if (hasNextGroup && onRequestNextGroup) {
      return transitionToGroup('next', onRequestNextGroup);
    }

    requestClose();
    return false;
  }, [hasNextGroup, onRequestNextGroup, requestClose, transitionToGroup]);

  const requestPreviousGroup = useCallback(() => {
    if (hasPreviousGroup && onRequestPreviousGroup) {
      return transitionToGroup('previous', onRequestPreviousGroup);
    }

    return false;
  }, [hasPreviousGroup, onRequestPreviousGroup, transitionToGroup]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) {
        requestPreviousGroup();
        return;
      }

      if (index >= moments.length) {
        requestNextGroup();
        return;
      }

      elapsedRef.current = 0;
      setProgress(0);
      progressRef.current = 0;
      setMenuOpen(false);
      setMomentReady(false);
      setMediaError(false);
      setReplySent(false);
      setCurrentIndex(index);
    },
    [moments.length, requestNextGroup, requestPreviousGroup],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          (gestureState.dy > DISMISS_PAN_ACTIVATION_DISTANCE &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.15) ||
          (Math.abs(gestureState.dx) > DISMISS_PAN_ACTIVATION_DISTANCE &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          (gestureState.dy > DISMISS_PAN_ACTIVATION_DISTANCE &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.15) ||
          (Math.abs(gestureState.dx) > DISMISS_PAN_ACTIVATION_DISTANCE &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2),
        onPanResponderGrant: () => {
          groupTranslateX.stopAnimation();
          setPaused(true);
        },
        onPanResponderMove: (_event, gestureState) => {
          if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
            groupTranslateX.setValue(Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, gestureState.dx * 0.72)));
            return;
          }

          if (gestureState.dy <= 0) {
            return;
          }

          translateY.setValue(gestureState.dy);
          overlayOpacity.setValue(Math.max(0.72, 1 - gestureState.dy / 420));
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2) {
            const shouldMoveNext = gestureState.dx < -GROUP_SWIPE_DISTANCE || gestureState.vx < -GROUP_SWIPE_VELOCITY;
            const shouldMovePrevious = gestureState.dx > GROUP_SWIPE_DISTANCE || gestureState.vx > GROUP_SWIPE_VELOCITY;

            if (shouldMoveNext) {
              requestNextGroup();
              return;
            }

            if (shouldMovePrevious) {
              requestPreviousGroup();
              return;
            }

            animateResetPosition(true);
            return;
          }

          if (gestureState.dy > DISMISS_DRAG_THRESHOLD || gestureState.vy > DISMISS_VELOCITY_THRESHOLD) {
            requestClose();
            return;
          }

          animateResetPosition(true);
        },
        onPanResponderTerminate: () => {
          animateResetPosition(true);
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => false,
      }),
    [
      animateResetPosition,
      groupTranslateX,
      overlayOpacity,
      requestClose,
      requestNextGroup,
      requestPreviousGroup,
      translateY,
    ],
  );

  useEffect(() => {
    const startMoment = moments[startIndex] ?? null;
    if (!open || !startMoment) {
      return;
    }

    closingRef.current = false;
    elapsedRef.current = 0;
    setCurrentIndex(startIndex);
    setProgress(0);
    setMenuOpen(false);
    setMediaError(false);
    setReplySent(false);
    setPaused(Boolean(pendingGroupDirectionRef.current));
    setMomentReady(startMoment.type === EventMomentType.Text);
    if (embedded) {
      translateY.setValue(0);
      overlayOpacity.setValue(1);
      return;
    }

    if (pendingGroupDirectionRef.current) {
      translateY.setValue(0);
      overlayOpacity.setValue(1);
      return;
    }

    groupTranslateX.setValue(0);
    translateY.setValue(18);
    overlayOpacity.setValue(0.94);

    Animated.parallel([
      Animated.timing(translateY, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [embedded, groupTranslateX, moments, open, overlayOpacity, startIndex, translateY]);

  useEffect(() => {
    if (!open || embedded) {
      return;
    }

    const direction = pendingGroupDirectionRef.current;
    if (!direction) {
      return;
    }

    groupTranslateX.setValue(direction === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH);
    Animated.timing(groupTranslateX, {
      duration: 190,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      groupTransitionRef.current = false;
      pendingGroupDirectionRef.current = null;
      setPaused(false);
    });
  }, [embedded, groupKey, groupTranslateX, open]);

  useEffect(() => {
    if (!open || !currentMoment) {
      return;
    }

    elapsedRef.current = 0;
    setProgress(0);
    progressRef.current = 0;
    setMenuOpen(false);
    setReplySent(false);
    setMediaError(false);
    setMomentReady(currentMoment.type === EventMomentType.Text);
  }, [currentIndex, currentMoment, open]);

  useEffect(() => {
    if (
      !canInteractWithMoment ||
      !currentMoment ||
      currentMoment.type === EventMomentType.Video ||
      !isMomentReady ||
      paused
    ) {
      return;
    }

    let lastFrameAt = performance.now();

    const tick = (now: number) => {
      elapsedRef.current += now - lastFrameAt;
      lastFrameAt = now;
      const nextProgress = Math.min(1, elapsedRef.current / getMomentDurationMs(currentMoment));
      setProgress(nextProgress);
      progressRef.current = nextProgress;

      if (nextProgress >= 1) {
        if (embedded && moments.length === 1) {
          setProgress(1);
          return;
        }

        if (currentIndex >= moments.length - 1) {
          requestNextGroup();
          return;
        }

        goTo(currentIndex + 1);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    canInteractWithMoment,
    currentIndex,
    currentMoment,
    embedded,
    goTo,
    isMomentReady,
    moments.length,
    paused,
    requestClose,
  ]);

  useEffect(() => {
    if (!canInteractWithMoment || !currentMoment || currentMoment.type !== EventMomentType.Video) {
      videoPlayer.pause();

      if (embedded && currentMoment?.type === EventMomentType.Video) {
        videoPlayer.currentTime = 0;
        setProgress(0);
        progressRef.current = 0;
      }

      return;
    }

    if (!isMomentReady || paused) {
      videoPlayer.pause();
      return;
    }

    if (embedded && videoPlayer.currentTime >= Math.max((currentMoment.durationSeconds ?? 0) - 0.1, 0.1)) {
      videoPlayer.currentTime = 0;
      setProgress(0);
      progressRef.current = 0;
    }

    videoPlayer.play();
  }, [canInteractWithMoment, currentMoment, embedded, isMomentReady, paused, videoPlayer]);

  useEffect(() => {
    videoPlayer.muted = isMuted;
  }, [isMuted, videoPlayer]);

  useEffect(() => {
    if (!canInteractWithMoment || !mediaError) {
      return;
    }

    const timer = setTimeout(() => {
      if (embedded && moments.length === 1) {
        return;
      }

      if (currentIndex >= moments.length - 1) {
        requestNextGroup();
        return;
      }

      goTo(currentIndex + 1);
    }, 2500);

    return () => clearTimeout(timer);
  }, [canInteractWithMoment, currentIndex, embedded, goTo, mediaError, moments.length, requestNextGroup]);

  useEffect(() => {
    return () => {
      clearReplySentTimeout();
    };
  }, []);

  if (!open || !currentMoment) {
    return null;
  }

  const currentBackground = resolveBackgroundColor(currentMoment.background);
  const isVideoMoment = currentMoment.type === EventMomentType.Video;
  const supportsMedia = currentMoment.type === EventMomentType.Image || currentMoment.type === EventMomentType.Video;
  const momentEventId = currentMoment.event?.eventId ?? currentMoment.eventId;
  const showReplyComposer = Boolean(viewerUserId && viewerUserId !== currentMoment.authorId && currentMoment.authorId);
  const isOwnedByViewer = Boolean(viewerUserId && currentMoment.authorId === viewerUserId);
  const captionBottomOffset = showReplyComposer ? 18 : 28;

  const handleOpenAuthor = () => {
    const authorUserId = currentMoment.author?.userId ?? currentMoment.authorId;
    if (!authorUserId) {
      return;
    }

    requestClose(() => {
      if (viewerUserId && authorUserId === viewerUserId) {
        navigation.navigate('Account');
        return;
      }

      navigation.navigate('UserProfile', {
        avatarUrl: currentMoment.author?.profile_picture,
        displayName,
        userId: authorUserId,
        username: currentMoment.author?.username,
      });
    });
  };

  const handleOpenEvent = async () => {
    if (!momentEventId) {
      return;
    }

    try {
      const { data } = await loadLinkedEvent({
        variables: {
          options: {
            filters: [{ field: 'eventId', value: momentEventId }],
            pagination: { limit: 1 },
          },
        },
      });

      const eventSeries = data?.readEvents?.[0];
      const occurrence = eventSeries ? mapEventSeriesToOccurrence(eventSeries) : null;

      requestClose(() => {
        if (occurrence) {
          navigation.navigate('EventDetails', { occurrence });
          return;
        }

        navigation.navigate('Events', {
          initialEventId: momentEventId,
          initialSearch: currentMoment.event?.title ?? '',
        });
      });
    } catch {
      requestClose(() => {
        navigation.navigate('Events', {
          initialEventId: momentEventId,
          initialSearch: currentMoment.event?.title ?? '',
        });
      });
    }
  };

  const handleReply = (message: string) => {
    if (!currentMoment.authorId) {
      return false;
    }

    return sendChatMessage(currentMoment.authorId, message, {
      replyToMomentCaption: currentMoment.caption ?? undefined,
      replyToMomentId: currentMoment.momentId,
      replyToMomentType: currentMoment.type,
    });
  };

  const handleDeleteMoment = () => {
    Alert.alert('Delete moment?', 'This action cannot be undone.', [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void (async () => {
            try {
              const deleted = await deleteMoment(currentMoment.momentId);
              if (!deleted) {
                throw new Error('Delete failed');
              }
              apolloClient.cache.evict({
                id: apolloClient.cache.identify({ __typename: 'EventMoment', momentId: currentMoment.momentId }),
              });
              apolloClient.cache.gc();
              onDeleted?.(currentMoment.momentId);
              setMenuOpen(false);
              requestClose();
            } catch {
              Alert.alert('Delete failed', 'We could not delete this moment right now.');
            }
          })();
        },
      },
    ]);
  };

  const storyContent = (
    <Animated.View
      {...(embedded ? undefined : panResponder.panHandlers)}
      style={[
        styles.viewerShell,
        embedded ? [styles.embeddedViewerShell, containerHeight ? { height: containerHeight } : null] : null,
        !embedded
          ? {
              paddingBottom: insets.bottom,
              paddingTop: insets.top,
            }
          : null,
        {
          opacity: overlayOpacity,
          transform: [{ translateY }, { translateX: groupTranslateX }],
        },
      ]}
    >
      <View style={styles.storyArea}>
        <LinearGradient colors={['rgba(3,7,18,0.62)', 'rgba(3,7,18,0)']} pointerEvents="none" style={styles.topFade} />
        <View style={styles.bottomFade} pointerEvents="none" />

        <View style={styles.progressRow} pointerEvents="none">
          {moments.map((moment, index) => (
            <View key={moment.momentId} style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.heroText,
                    width:
                      index < currentIndex ? '100%' : index === currentIndex ? `${Math.max(progress, 0) * 100}%` : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.headerRow}>
          <Pressable hitSlop={10} onPress={handleOpenAuthor} style={styles.authorRow}>
            <ProfileAvatar imageUrl={currentMoment.author?.profile_picture} label={displayName} size={38} />
            <View style={styles.authorCopy}>
              <Text numberOfLines={1} style={[styles.authorName, { color: theme.colors.heroText }]}>
                {displayName}
              </Text>
              <Text style={[styles.authorTime, { color: theme.colors.heroSubtle }]}>
                {formatRelativeTime(currentMoment.createdAt)}
              </Text>
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            {isVideoMoment ? (
              <Pressable hitSlop={10} onPress={() => setIsMuted((currentMuted) => !currentMuted)}>
                <Feather color={theme.colors.heroText} name={isMuted ? 'volume-x' : 'volume-2'} size={22} />
              </Pressable>
            ) : null}
            <Pressable
              hitSlop={10}
              onPress={() => {
                setMenuOpen(true);
                setPaused(true);
              }}
            >
              <Feather color={theme.colors.heroText} name="more-horizontal" size={22} />
            </Pressable>
            {showCloseButton ? (
              <Pressable hitSlop={10} onPress={() => requestClose()}>
                <Feather color={theme.colors.heroText} name="x" size={28} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.mediaWrap}>
          {supportsMedia && currentMoment.mediaUrl ? (
            currentMoment.type === EventMomentType.Video ? (
              <>
                <VideoView
                  contentFit="cover"
                  nativeControls={false}
                  onFirstFrameRender={() => setMomentReady(true)}
                  player={videoPlayer}
                  style={styles.mediaFrame}
                  useExoShutter={false}
                />
                {mediaError ? (
                  <View style={styles.mediaStateOverlay}>
                    <Text style={[styles.mediaStateText, { color: theme.colors.heroText }]}>Video unavailable</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Image
                  onError={() => {
                    setMomentReady(true);
                    setMediaError(true);
                  }}
                  onLoad={() => setMomentReady(true)}
                  source={{ uri: currentMoment.mediaUrl }}
                  style={styles.mediaFrame}
                />
                {mediaError ? (
                  <View style={styles.mediaStateOverlay}>
                    <Text style={[styles.mediaStateText, { color: theme.colors.heroText }]}>Image unavailable</Text>
                  </View>
                ) : null}
              </>
            )
          ) : (
            <View style={[styles.textMoment, { backgroundColor: currentBackground }]}>
              <Text style={[styles.textMomentCaption, { color: theme.colors.heroText }]}>
                {currentMoment.caption || 'Moment'}
              </Text>
            </View>
          )}
        </View>

        {supportsMedia && currentMoment.caption ? (
          <View style={[styles.captionWrap, { bottom: captionBottomOffset }]}>
            <Text style={[styles.captionText, { color: theme.colors.heroText }]}>{currentMoment.caption}</Text>
          </View>
        ) : null}

        {!embedded ? (
          <>
            <Pressable onPress={() => goTo(currentIndex - 1)} style={styles.leftTapZone} />
            <Pressable
              onPress={() => {
                if (currentIndex >= moments.length - 1) {
                  requestNextGroup();
                  return;
                }

                goTo(currentIndex + 1);
              }}
              style={styles.rightTapZone}
            />
          </>
        ) : null}

        {isMenuOpen ? (
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              setPaused(false);
            }}
            style={styles.menuBackdrop}
          />
        ) : null}

        {isMenuOpen ? (
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                handleOpenAuthor();
              }}
              style={styles.menuItem}
            >
              <Feather color={theme.colors.primary} name="user" size={16} />
              <View style={styles.menuCopy}>
                <Text style={[styles.menuLabel, { color: theme.colors.textPrimary }]}>View profile</Text>
                <Text style={[styles.menuHint, { color: theme.colors.textSecondary }]}>
                  @{currentMoment.author?.username ?? 'member'}
                </Text>
              </View>
            </Pressable>

            {momentEventId ? (
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  void handleOpenEvent();
                }}
                style={styles.menuItem}
              >
                <Feather color={theme.colors.primary} name="calendar" size={16} />
                <View style={styles.menuCopy}>
                  <Text style={[styles.menuLabel, { color: theme.colors.textPrimary }]}>View event</Text>
                  <Text numberOfLines={1} style={[styles.menuHint, { color: theme.colors.textSecondary }]}>
                    {currentMoment.event?.title ?? 'Open related event'}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {isOwnedByViewer ? (
              <Pressable onPress={handleDeleteMoment} style={styles.menuItem}>
                <Feather color={theme.colors.error} name="trash-2" size={16} />
                <View style={styles.menuCopy}>
                  <Text style={[styles.menuLabel, { color: theme.colors.error }]}>Delete moment</Text>
                  <Text style={[styles.menuHint, { color: theme.colors.textSecondary }]}>Remove this story</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {showReplyComposer ? (
        <View style={styles.composerShell}>
          <ChatComposer
            isConnected={isConnected}
            onAfterSend={() => {
              setReplySent(true);
              clearReplySentTimeout();
              pauseTimeoutRef.current = setTimeout(() => setReplySent(false), 2200);
            }}
            onBlur={() => {
              if (!isMenuOpen) {
                setPaused(false);
              }
            }}
            onFocus={() => setPaused(true)}
            onSend={handleReply}
            placeholder={`Reply to ${displayName}…`}
            showStatus={false}
            targetUserId={currentMoment.authorId}
            variant="overlay"
          />
          {replySent ? (
            <Text style={[styles.replySentLabel, { color: theme.colors.heroSubtle }]}>Reply sent</Text>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );

  if (embedded) {
    return <View style={styles.embeddedContainer}>{storyContent}</View>;
  }

  return (
    <Modal animationType="none" onRequestClose={() => requestClose()} statusBarTranslucent transparent visible={open}>
      <View style={styles.modalRoot}>{storyContent}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  authorCopy: {
    gap: 2,
    minWidth: 0,
  },
  authorName: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
  authorRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  authorTime: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  bottomFade: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    bottom: 0,
    height: 168,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  captionText: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  captionWrap: {
    backgroundColor: 'rgba(3,7,18,0.34)',
    borderRadius: 16,
    left: 18,
    maxHeight: 112,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
    right: 18,
    zIndex: 5,
  },
  composerShell: {
    backgroundColor: '#030712',
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderTopWidth: 1,
    minHeight: FOOTER_HEIGHT,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  embeddedContainer: {
    backgroundColor: '#030712',
    flex: 1,
  },
  embeddedViewerShell: {
    backgroundColor: '#030712',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    left: 16,
    position: 'absolute',
    right: 16,
    top: 22,
    zIndex: 6,
  },
  leftTapZone: {
    bottom: FOOTER_HEIGHT,
    left: 0,
    position: 'absolute',
    top: HEADER_ZONE_HEIGHT,
    width: SCREEN_WIDTH * 0.34,
    zIndex: 3,
  },
  mediaFrame: {
    height: '100%',
    width: '100%',
  },
  mediaStateOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(3,7,18,0.4)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  mediaStateText: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  mediaWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  menuBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 7,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 6,
    position: 'absolute',
    right: 16,
    top: 68,
    width: 228,
    zIndex: 8,
  },
  menuCopy: {
    flex: 1,
    gap: 1,
  },
  menuHint: {
    ...typography.bodyRegular,
    fontSize: fontSize.xs,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  modalRoot: {
    backgroundColor: '#030712',
    flex: 1,
  },
  progressFill: {
    borderRadius: 999,
    height: 2.5,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 5,
    left: 12,
    paddingTop: 12,
    position: 'absolute',
    right: 12,
    top: 0,
    zIndex: 7,
  },
  progressTrack: {
    borderRadius: 999,
    flex: 1,
    height: 2.5,
    overflow: 'hidden',
  },
  replySentLabel: {
    ...typography.bodyMedium,
    fontSize: fontSize.xs,
    marginTop: -6,
    paddingBottom: 12,
    textAlign: 'center',
  },
  rightTapZone: {
    bottom: FOOTER_HEIGHT,
    position: 'absolute',
    right: 0,
    top: HEADER_ZONE_HEIGHT,
    width: SCREEN_WIDTH * 0.34,
    zIndex: 3,
  },
  storyArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  textMoment: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  textMomentCaption: {
    ...typography.displayBold,
    fontSize: 28,
    lineHeight: 38,
    textAlign: 'center',
  },
  topFade: {
    height: 150,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  viewerShell: {
    flex: 1,
  },
});
