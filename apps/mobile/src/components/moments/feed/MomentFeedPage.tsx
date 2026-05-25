import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLazyQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayer } from 'expo-video';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { EventMomentType } from '@data/graphql/types/graphql';
import { GetEventsDocument } from '@data/graphql/query/Event/query';
import type { MobileMomentsFeedMoment } from '@data/graphql/query/EventMoment/types';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { RemoteImage } from '@/components/core/RemoteImage';
import { ChatComposer } from '@/components/messages/thread/ChatComposer';
import { useDeleteEventMoment } from '@/hooks/moments/useDeleteEventMoment';
import { useChatRealtime } from '@/hooks/messages/useChatRealtime';
import { getApolloAuthContext } from '@/lib/auth';
import { STICKY_COMPOSER_KEYBOARD_OFFSET } from '@/lib/constants/layout';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';
import { formatRelativeTime, getDisplayName } from '@/lib/events/formatters';
import { MOMENT_BACKGROUND_SWATCHES } from '@/lib/moments/constants';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

const STORY_DURATION_MS = 5000;

function resolveBackgroundColor(token?: string | null): string {
  return MOMENT_BACKGROUND_SWATCHES.find((swatch) => swatch.token === token)?.color ?? '#9333ea';
}

function getMomentDurationMs(moment: MobileMomentsFeedMoment): number {
  if (moment.type === EventMomentType.Video && moment.durationSeconds) {
    return Math.max(moment.durationSeconds * 1000, 1000);
  }

  return STORY_DURATION_MS;
}

export function MomentFeedPage({
  active,
  moment,
  onDeleted,
  pageHeight,
}: {
  active: boolean;
  moment: MobileMomentsFeedMoment;
  onDeleted?: (momentId: string) => void;
  pageHeight: number;
}) {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, userId: viewerUserId } = useAppShell();
  const { theme } = useAppTheme();
  const { isConnected, sendChatMessage } = useChatRealtime({
    enabled: Boolean(viewerUserId),
  });
  const { deleteMoment } = useDeleteEventMoment(authToken);
  const [isMuted, setIsMuted] = useState(true);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isMediaReady, setMediaReady] = useState(moment.type === EventMomentType.Text);
  const [hasMediaError, setMediaError] = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [loadLinkedEvent] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    ...getApolloAuthContext(authToken),
  });
  const videoSource = useMemo(
    () => (moment.type === EventMomentType.Video && moment.mediaUrl ? { uri: moment.mediaUrl } : null),
    [moment.mediaUrl, moment.type],
  );
  const configureVideoPlayer = useCallback((player: VideoPlayer) => {
    player.loop = false;
    player.muted = true;
    player.timeUpdateEventInterval = 0.5;
  }, []);
  const videoPlayer = useVideoPlayer(videoSource, configureVideoPlayer);
  const authorUserId = moment.author?.userId ?? moment.authorId;
  const displayName = useMemo(() => getDisplayName(moment.author), [moment.author]);
  const targetUserId = authorUserId && authorUserId !== viewerUserId ? authorUserId : undefined;
  const isOwnedByViewer = Boolean(viewerUserId && moment.authorId === viewerUserId);

  useEventListener(videoPlayer, 'statusChange', (payload) => {
    if (payload.status === 'readyToPlay') {
      setMediaReady(true);
      setMediaError(false);
    }

    if (payload.error) {
      setMediaError(true);
      setMediaReady(true);
    }
  });

  useEventListener(videoPlayer, 'timeUpdate', (payload) => {
    if (!active || moment.type !== EventMomentType.Video || !isMediaReady) {
      return;
    }

    const nextProgress = Math.min(1, (payload.currentTime * 1000) / getMomentDurationMs(moment));
    if (Math.abs(nextProgress - progressRef.current) < 0.02 && nextProgress < 1) {
      return;
    }

    progressRef.current = nextProgress;
    setProgress(nextProgress);
  });

  useEffect(() => {
    setMenuOpen(false);
    setIsMuted(true);
    setMediaError(false);
    setMediaReady(moment.type === EventMomentType.Text);
    setProgress(0);
    progressRef.current = 0;
    elapsedRef.current = 0;
  }, [moment.background, moment.mediaUrl, moment.momentId, moment.type]);

  useEffect(() => {
    if (!active) {
      if (videoSource) {
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
      }
      setProgress(0);
      progressRef.current = 0;
      elapsedRef.current = 0;
      return;
    }

    if (moment.type === EventMomentType.Video) {
      if (!videoSource || !isMediaReady) {
        return;
      }

      if (videoPlayer.currentTime >= Math.max((moment.durationSeconds ?? 0) - 0.1, 0.1)) {
        videoPlayer.currentTime = 0;
        setProgress(0);
        progressRef.current = 0;
      }

      videoPlayer.play();

      return () => {
        videoPlayer.pause();
      };
    }

    if (!isMediaReady) {
      return;
    }

    let lastFrameAt = performance.now();

    const tick = (now: number) => {
      elapsedRef.current += now - lastFrameAt;
      lastFrameAt = now;
      const nextProgress = Math.min(1, elapsedRef.current / getMomentDurationMs(moment));
      setProgress(nextProgress);
      progressRef.current = nextProgress;

      if (nextProgress >= 1) {
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
  }, [active, isMediaReady, moment, videoPlayer, videoSource]);

  useEffect(() => {
    videoPlayer.muted = isMuted;
  }, [isMuted, videoPlayer]);

  useEventListener(videoPlayer, 'playToEnd', () => {
    if (!active || moment.type !== EventMomentType.Video) {
      return;
    }

    setProgress(1);
    progressRef.current = 1;
    videoPlayer.pause();
  });

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (!videoSource) {
        return;
      }
      videoPlayer.pause();
    };
  }, [videoPlayer, videoSource]);

  const handleOpenProfile = () => {
    setMenuOpen(false);

    if (!authorUserId) {
      return;
    }

    if (viewerUserId && authorUserId === viewerUserId) {
      navigation.navigate('MainTabs', { screen: 'Account' });
      return;
    }

    navigation.navigate('UserProfile', {
      avatarUrl: moment.author?.profile_picture,
      displayName,
      userId: authorUserId,
      username: moment.author?.username,
    });
  };

  const handleOpenEvent = async () => {
    setMenuOpen(false);

    if (!moment.eventId) {
      return;
    }

    try {
      const { data } = await loadLinkedEvent({
        variables: {
          options: {
            filters: [{ field: 'eventId', value: moment.eventId }],
            pagination: { limit: 1 },
          },
        },
      });

      const eventSeries = data?.readEvents?.[0];
      const occurrence = eventSeries ? mapEventSeriesToOccurrence(eventSeries) : null;

      if (occurrence) {
        navigation.navigate('EventDetails', { occurrence });
        return;
      }

      navigation.navigate('Events', {
        initialEventId: moment.eventId,
        initialSearch: moment.event?.title ?? '',
      });
    } catch {
      navigation.navigate('Events', {
        initialEventId: moment.eventId,
        initialSearch: moment.event?.title ?? '',
      });
    }
  };

  const handleReply = (message: string) => {
    if (!targetUserId) {
      return false;
    }

    return sendChatMessage(targetUserId, message, {
      replyToMomentCaption: moment.caption ?? undefined,
      replyToMomentId: moment.momentId,
      replyToMomentType: moment.type,
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
              const deleted = await deleteMoment(moment.momentId);
              if (!deleted) {
                throw new Error('Delete failed');
              }
              setMenuOpen(false);
              onDeleted?.(moment.momentId);
            } catch {
              Alert.alert('Delete failed', 'We could not delete this moment right now.');
            }
          })();
        },
      },
    ]);
  };

  const backgroundColor =
    moment.type === EventMomentType.Text ? resolveBackgroundColor(moment.background) : theme.colors.background;

  return (
    <View style={[styles.page, { backgroundColor, height: pageHeight }]}>
      {isMenuOpen ? <Pressable onPress={() => setMenuOpen(false)} style={styles.menuBackdrop} /> : null}

      <LinearGradient colors={['rgba(3,7,18,0.18)', 'rgba(3,7,18,0)']} pointerEvents="none" style={styles.topFade} />
      <View style={styles.bottomGradient} pointerEvents="none" />

      <View style={styles.progressRow} pointerEvents="none">
        <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.heroText,
                width: `${Math.max(progress, 0) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.header}>
        <Pressable onPress={handleOpenProfile} style={styles.authorRow}>
          <ProfileAvatar imageUrl={moment.author?.profile_picture} label={displayName} size={44} />
          <View style={styles.authorCopy}>
            <Text numberOfLines={1} style={[styles.authorName, { color: theme.colors.heroText }]}>
              {displayName}
            </Text>
            <Text style={[styles.authorTime, { color: 'rgba(255,255,255,0.74)' }]}>
              {formatRelativeTime(moment.createdAt)}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          {moment.type === EventMomentType.Video ? (
            <Pressable onPress={() => setIsMuted((currentMuted) => !currentMuted)} style={styles.headerButton}>
              <Feather color={theme.colors.heroText} name={isMuted ? 'volume-x' : 'volume-2'} size={22} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setMenuOpen((current) => !current)} style={styles.headerButton}>
            <Feather color={theme.colors.heroText} name="more-horizontal" size={24} />
          </Pressable>
        </View>
      </View>

      {isMenuOpen ? (
        <View
          style={[styles.menuCard, { backgroundColor: 'rgba(15,23,42,0.96)', borderColor: 'rgba(255,255,255,0.14)' }]}
        >
          <Pressable onPress={handleOpenProfile} style={styles.menuItem}>
            <Feather color={theme.colors.heroText} name="user" size={17} />
            <Text style={[styles.menuLabel, { color: theme.colors.heroText }]}>View profile</Text>
          </Pressable>
          <Pressable onPress={handleOpenEvent} style={styles.menuItem}>
            <Feather color={theme.colors.heroText} name="calendar" size={17} />
            <Text style={[styles.menuLabel, { color: theme.colors.heroText }]}>View event</Text>
          </Pressable>
          {isOwnedByViewer ? (
            <Pressable onPress={handleDeleteMoment} style={styles.menuItem}>
              <Feather color={theme.colors.error} name="trash-2" size={17} />
              <Text style={[styles.menuLabel, { color: theme.colors.error }]}>Delete moment</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.content}>
        {moment.type === EventMomentType.Image && moment.mediaUrl ? (
          <>
            <RemoteImage
              fallback={
                <View style={[styles.mediaFallback, { backgroundColor: resolveBackgroundColor(moment.background) }]}>
                  <Feather color={theme.colors.heroText} name="image" size={42} />
                </View>
              }
              onError={() => {
                setMediaError(true);
                setMediaReady(true);
              }}
              onLoad={() => setMediaReady(true)}
              resizeMode="cover"
              uri={moment.mediaUrl}
              style={styles.media}
            />
            {moment.caption ? (
              <Text style={[styles.caption, { color: theme.colors.heroText }]}>{moment.caption}</Text>
            ) : null}
          </>
        ) : null}

        {moment.type === EventMomentType.Video && moment.mediaUrl ? (
          <>
            <VideoView
              contentFit="cover"
              nativeControls={false}
              onFirstFrameRender={() => setMediaReady(true)}
              player={videoPlayer}
              style={styles.media}
              useExoShutter={false}
            />
            {moment.caption ? (
              <Text style={[styles.caption, { color: theme.colors.heroText }]}>{moment.caption}</Text>
            ) : null}
          </>
        ) : null}

        {moment.type === EventMomentType.Text ? (
          <View style={styles.textMoment}>
            <Text style={[styles.textMomentCaption, { color: theme.colors.heroText }]}>
              {moment.caption || 'No caption'}
            </Text>
          </View>
        ) : null}

        {!isMediaReady && !hasMediaError ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={theme.colors.heroText} size="small" />
          </View>
        ) : null}

        {hasMediaError ? (
          <View style={styles.loadingOverlay}>
            <Text style={[styles.errorText, { color: theme.colors.heroText }]}>
              This moment could not be displayed.
            </Text>
          </View>
        ) : null}
      </View>

      <KeyboardStickyView offset={{ opened: STICKY_COMPOSER_KEYBOARD_OFFSET }} style={styles.footer}>
        <ChatComposer
          isConnected={isConnected}
          onSend={handleReply}
          placeholder={targetUserId ? `Reply to ${moment.author?.username ?? displayName}...` : 'Your moment'}
          showStatus={false}
          targetUserId={targetUserId}
          variant="overlay"
        />
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  authorCopy: {
    gap: 2,
  },
  authorName: {
    ...typography.bodyBold,
    fontSize: fontSize.xl,
  },
  authorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    maxWidth: '80%',
  },
  authorTime: {
    ...typography.bodyMedium,
    fontSize: fontSize.sm,
  },
  bottomGradient: {
    backgroundColor: 'rgba(2,6,23,0.72)',
    bottom: 0,
    height: 220,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  caption: {
    ...typography.bodyBold,
    bottom: 100,
    fontSize: fontSize.xl,
    left: 18,
    position: 'absolute',
    right: 18,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  errorText: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  footer: {
    bottom: 4,
    left: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 24,
    zIndex: 4,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  loadingOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  media: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  mediaFallback: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  menuBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 2,
    padding: 8,
    position: 'absolute',
    right: 14,
    top: 68,
    zIndex: 5,
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  menuLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  page: {
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    borderRadius: 999,
    height: 2.5,
  },
  progressRow: {
    left: 12,
    paddingTop: 12,
    position: 'absolute',
    right: 12,
    top: 0,
    zIndex: 5,
  },
  progressTrack: {
    borderRadius: 999,
    height: 2.5,
    overflow: 'hidden',
  },
  textMoment: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  textMomentCaption: {
    ...typography.displayBold,
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },
  topFade: {
    height: 140,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
});
