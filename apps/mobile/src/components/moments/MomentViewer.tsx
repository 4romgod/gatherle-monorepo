import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLazyQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { EventMomentState } from '@data/graphql/types/graphql';
import { EventMomentType } from '@data/graphql/types/graphql';
import { GetEventsDocument } from '@data/graphql/query/Event/query';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { ChatComposer } from '@/components/messages/thread/ChatComposer';
import { useChatRealtime } from '@/hooks/messages/useChatRealtime';
import { getApolloAuthContext } from '@/lib/auth';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';
import { formatRelativeTime, getDisplayName } from '@/lib/events/formatters';
import { MOMENT_BACKGROUND_SWATCHES } from '@/lib/moments/constants';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

const STORY_DURATION_MS = 5000;
const SCREEN = Dimensions.get('window');
const SCREEN_WIDTH = SCREEN.width;
const SCREEN_HEIGHT = SCREEN.height;
const FOOTER_HEIGHT = 118;
const HEADER_ZONE_HEIGHT = 112;

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
  moments,
  onClose,
  open,
  startIndex = 0,
}: {
  moments: MomentLike[];
  onClose: () => void;
  open: boolean;
  startIndex?: number;
}) {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, userId: viewerUserId } = useAppShell();
  const { theme } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isMuted, setIsMuted] = useState(true);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isMomentReady, setMomentReady] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replySent, setReplySent] = useState(false);
  const elapsedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  const currentMomentRef = useRef<MomentLike | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const currentMoment = moments[currentIndex] ?? null;
  currentMomentRef.current = currentMoment;
  const displayName = useMemo(() => getDisplayName(currentMoment?.author), [currentMoment?.author]);
  const { isConnected, sendChatMessage } = useChatRealtime({
    enabled: Boolean(viewerUserId),
  });
  const videoSource =
    currentMoment?.type === EventMomentType.Video && currentMoment.mediaUrl ? { uri: currentMoment.mediaUrl } : null;
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.muted = true;
    player.timeUpdateEventInterval = 0.25;
  });
  const [loadLinkedEvent] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    ...getApolloAuthContext(authToken),
  });
  const videoProgress = useEvent(videoPlayer, 'timeUpdate', {
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    currentTime: 0,
  });

  useEventListener(videoPlayer, 'playToEnd', () => {
    const activeMoment = currentMomentRef.current;
    if (!open || !activeMoment || activeMoment.type !== EventMomentType.Video) {
      return;
    }

    if (currentIndex >= moments.length - 1) {
      requestClose();
      return;
    }

    goTo(currentIndex + 1);
  });

  useEventListener(videoPlayer, 'statusChange', (payload) => {
    const activeMoment = currentMomentRef.current;
    if (!open || !activeMoment || activeMoment.type !== EventMomentType.Video) {
      return;
    }

    if (payload.error) {
      setMomentReady(true);
      setMediaError(true);
    }
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
      ]).start(() => {
        if (resumePlayback) {
          setPaused(false);
        }
      });
    },
    [overlayOpacity, translateY],
  );

  const requestClose = useCallback(
    (afterClose?: () => void) => {
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
        onClose();
        afterClose?.();
      });
    },
    [onClose, overlayOpacity, translateY],
  );

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) {
        return;
      }

      if (index >= moments.length) {
        requestClose();
        return;
      }

      elapsedRef.current = 0;
      setProgress(0);
      setMenuOpen(false);
      setMomentReady(false);
      setMediaError(false);
      setReplySent(false);
      setCurrentIndex(index);
    },
    [moments.length, requestClose],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          setPaused(true);
        },
        onPanResponderMove: (_event, gestureState) => {
          if (gestureState.dy <= 0) {
            return;
          }

          translateY.setValue(gestureState.dy);
          overlayOpacity.setValue(Math.max(0.72, 1 - gestureState.dy / 420));
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > 140) {
            requestClose();
            return;
          }

          animateResetPosition(true);
        },
        onPanResponderTerminate: () => {
          animateResetPosition(true);
        },
      }),
    [animateResetPosition, overlayOpacity, requestClose, translateY],
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
    setPaused(false);
    setMomentReady(startMoment.type === EventMomentType.Text);
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
  }, [moments, open, overlayOpacity, startIndex, translateY]);

  useEffect(() => {
    if (!open || !currentMoment) {
      return;
    }

    elapsedRef.current = 0;
    setProgress(0);
    setMenuOpen(false);
    setReplySent(false);
    setMediaError(false);
    setMomentReady(currentMoment.type === EventMomentType.Text);
  }, [currentIndex, currentMoment, open]);

  useEffect(() => {
    if (!open || !currentMoment || currentMoment.type === EventMomentType.Video || !isMomentReady || paused) {
      return;
    }

    let lastFrameAt = performance.now();

    const tick = (now: number) => {
      elapsedRef.current += now - lastFrameAt;
      lastFrameAt = now;
      const nextProgress = Math.min(1, elapsedRef.current / getMomentDurationMs(currentMoment));
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        if (currentIndex >= moments.length - 1) {
          requestClose();
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
  }, [currentIndex, currentMoment, goTo, isMomentReady, moments.length, open, paused, requestClose]);

  useEffect(() => {
    if (!open || !currentMoment || currentMoment.type !== EventMomentType.Video || !isMomentReady) {
      return;
    }

    const durationMs = getMomentDurationMs(currentMoment);
    setProgress(Math.min(1, (videoProgress.currentTime * 1000) / durationMs));
  }, [currentMoment, isMomentReady, open, videoProgress.currentTime]);

  useEffect(() => {
    if (!open || !currentMoment || currentMoment.type !== EventMomentType.Video) {
      videoPlayer.pause();
      return;
    }

    if (!isMomentReady || paused) {
      videoPlayer.pause();
      return;
    }

    videoPlayer.play();
  }, [currentMoment, isMomentReady, open, paused, videoPlayer]);

  useEffect(() => {
    videoPlayer.muted = isMuted;
  }, [isMuted, videoPlayer]);

  useEffect(() => {
    if (!open || !mediaError) {
      return;
    }

    const timer = setTimeout(() => {
      if (currentIndex >= moments.length - 1) {
        requestClose();
        return;
      }

      goTo(currentIndex + 1);
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentIndex, goTo, mediaError, moments.length, open, requestClose]);

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

  return (
    <Modal animationType="none" onRequestClose={() => requestClose()} statusBarTranslucent transparent visible={open}>
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.viewerShell,
            {
              opacity: overlayOpacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.storyArea} {...panResponder.panHandlers}>
            <View style={styles.topFade} pointerEvents="none" />
            <View style={styles.bottomFade} pointerEvents="none" />

            <View style={styles.progressRow} pointerEvents="none">
              {moments.map((moment, index) => (
                <View
                  key={moment.momentId}
                  style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.28)' }]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.colors.heroText,
                        width:
                          index < currentIndex
                            ? '100%'
                            : index === currentIndex
                              ? `${Math.max(progress, 0) * 100}%`
                              : '0%',
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
                <Pressable hitSlop={10} onPress={() => requestClose()}>
                  <Feather color={theme.colors.heroText} name="x" size={28} />
                </Pressable>
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
              <View style={styles.captionWrap}>
                <Text style={[styles.captionText, { color: theme.colors.heroText }]}>{currentMoment.caption}</Text>
              </View>
            ) : null}

            <Pressable onPress={() => goTo(currentIndex - 1)} style={styles.leftTapZone} />
            <Pressable
              onPress={() => {
                if (currentIndex >= moments.length - 1) {
                  requestClose();
                  return;
                }

                goTo(currentIndex + 1);
              }}
              style={styles.rightTapZone}
            />

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
      </View>
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
    bottom: FOOTER_HEIGHT + 20,
    left: 18,
    position: 'absolute',
    right: 18,
  },
  composerShell: {
    backgroundColor: '#030712',
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderTopWidth: 1,
    minHeight: FOOTER_HEIGHT,
    paddingHorizontal: 16,
    paddingTop: 6,
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
    backgroundColor: 'rgba(0,0,0,0.34)',
    height: 120,
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
