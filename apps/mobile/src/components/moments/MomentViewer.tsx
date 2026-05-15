import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, Image, Dimensions } from 'react-native';
import { useLazyQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { EventMomentState, EventMomentType } from '@data/graphql/types/graphql';
import { GetEventsDocument } from '@data/graphql/query/Event/query';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { getApolloAuthContext } from '@/lib/auth';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { getDisplayName, formatRelativeTime } from '@/lib/events/formatters';
import { mapEventSeriesToOccurrence } from '@/lib/events/adapters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

const STORY_DURATION_MS = 5000;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
  switch (token) {
    case 'bg-blue-600':
      return '#2563eb';
    case 'bg-green-600':
      return '#16a34a';
    case 'bg-red-600':
      return '#dc2626';
    case 'bg-orange-500':
      return '#f97316';
    case 'bg-pink-600':
      return '#db2777';
    case 'bg-indigo-600':
      return '#4f46e5';
    case 'bg-teal-600':
      return '#0d9488';
    case 'bg-yellow-400':
      return '#facc15';
    case 'bg-cyan-500':
      return '#06b6d4';
    case 'bg-purple-600':
    default:
      return '#9333ea';
  }
}

function getMomentDurationMs(moment: MomentLike): number {
  if (moment.type === 'Video' && moment.durationSeconds) {
    return moment.durationSeconds * 1000;
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
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const currentMoment = moments[currentIndex];
  const displayName = useMemo(() => getDisplayName(currentMoment?.author), [currentMoment?.author]);
  const videoSource =
    currentMoment?.type === 'Video' && currentMoment.mediaUrl ? { uri: currentMoment.mediaUrl } : null;
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.muted = true;
  });
  const [loadLinkedEvent] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    ...getApolloAuthContext(authToken),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentIndex(startIndex);
    setProgress(0);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open || !currentMoment) {
      return;
    }

    startedAtRef.current = performance.now();
    setProgress(0);

    const tick = (now: number) => {
      const duration = getMomentDurationMs(currentMoment);
      const nextProgress = Math.min(1, (now - startedAtRef.current) / duration);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        if (currentIndex >= moments.length - 1) {
          onClose();
          return;
        }

        setCurrentIndex((previousIndex) => previousIndex + 1);
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
  }, [currentIndex, currentMoment, moments.length, onClose, open]);

  useEffect(() => {
    if (currentMoment?.type === 'Video' && open) {
      videoPlayer.play();
      return;
    }

    videoPlayer.pause();
  }, [currentMoment?.type, open, videoPlayer]);

  if (!currentMoment) {
    return null;
  }

  const currentBackground = resolveBackgroundColor(currentMoment.background);
  const supportsMedia = currentMoment.type === 'Image' || currentMoment.type === 'Video';
  const momentEventId = currentMoment.event?.eventId ?? currentMoment.eventId;

  const handleOpenAuthor = () => {
    const authorUserId = currentMoment.author?.userId ?? currentMoment.authorId;
    if (!authorUserId) {
      return;
    }

    onClose();

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
  };

  const handleOpenEvent = async () => {
    if (!momentEventId) {
      return;
    }

    const fallbackSearch = currentMoment.event?.title ?? '';
    const fallbackNavigate = () =>
      navigation.navigate('Events', {
        initialEventId: momentEventId,
        initialSearch: fallbackSearch,
      });

    onClose();

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

      if (occurrence) {
        navigation.navigate('EventDetails', { occurrence });
        return;
      }
    } catch {
      // Fall through to the event feed if the direct lookup fails.
    }

    fallbackNavigate();
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={open}>
      <View style={[styles.overlay, { backgroundColor: '#030712' }]}>
        <View style={styles.progressRow}>
          {moments.map((moment, index) => (
            <View key={moment.momentId} style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
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
          <Pressable hitSlop={8} onPress={handleOpenAuthor} style={styles.authorRow}>
            <ProfileAvatar imageUrl={currentMoment.author?.profile_picture} label={displayName} size={38} />
            <View style={styles.authorCopy}>
              <Text style={[styles.authorName, { color: theme.colors.heroText }]}>{displayName}</Text>
              <Text style={[styles.authorTime, { color: theme.colors.heroSubtle }]}>
                {formatRelativeTime(currentMoment.createdAt)}
              </Text>
            </View>
          </Pressable>

          <Pressable hitSlop={12} onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.colors.heroText }]}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {supportsMedia && currentMoment.mediaUrl ? (
            currentMoment.type === 'Video' ? (
              <VideoView contentFit="cover" nativeControls={false} player={videoPlayer} style={styles.mediaFrame} />
            ) : (
              <Image source={{ uri: currentMoment.mediaUrl }} style={styles.mediaFrame} />
            )
          ) : (
            <View style={[styles.textMoment, { backgroundColor: currentBackground }]}>
              <Text style={[styles.textMomentCaption, { color: theme.colors.heroText }]}>
                {currentMoment.caption || 'Moment'}
              </Text>
            </View>
          )}

          {supportsMedia && currentMoment.caption ? (
            <View style={styles.captionWrap}>
              <Text style={[styles.captionText, { color: theme.colors.heroText }]}>{currentMoment.caption}</Text>
            </View>
          ) : null}

          {momentEventId ? (
            <Pressable
              onPress={handleOpenEvent}
              style={[
                styles.eventLinkPill,
                {
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.24)',
                },
              ]}
            >
              <Text numberOfLines={1} style={[styles.eventLinkText, { color: theme.colors.heroText }]}>
                {currentMoment.event?.title ? `View event: ${currentMoment.event.title}` : 'View event'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => setCurrentIndex((previousIndex) => Math.max(0, previousIndex - 1))}
          style={styles.leftTapZone}
        />
        <Pressable
          onPress={() => {
            if (currentIndex >= moments.length - 1) {
              onClose();
              return;
            }

            setCurrentIndex((previousIndex) => Math.min(moments.length - 1, previousIndex + 1));
          }}
          style={styles.rightTapZone}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  authorCopy: {
    gap: 2,
  },
  authorName: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
  authorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  authorTime: {
    ...typography.bodyMedium,
    fontSize: fontSize.base,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 32,
    paddingHorizontal: 18,
  },
  captionText: {
    ...typography.bodyMedium,
    fontSize: fontSize.xl,
    lineHeight: 24,
  },
  captionWrap: {
    bottom: 28,
    left: 30,
    position: 'absolute',
    right: 30,
  },
  closeText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  eventLinkPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 86,
    left: 30,
    maxWidth: SCREEN_WIDTH - 60,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 4,
  },
  eventLinkText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  leftTapZone: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 96,
    width: SCREEN_WIDTH * 0.32,
  },
  mediaFrame: {
    borderRadius: 28,
    height: '82%',
    width: '100%',
  },
  overlay: {
    flex: 1,
  },
  progressFill: {
    borderRadius: 999,
    height: 2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  progressTrack: {
    borderRadius: 999,
    flex: 1,
    height: 2,
    overflow: 'hidden',
  },
  rightTapZone: {
    bottom: 0,
    position: 'absolute',
    right: 0,
    top: 96,
    width: SCREEN_WIDTH * 0.32,
  },
  textMoment: {
    alignItems: 'center',
    borderRadius: 28,
    justifyContent: 'center',
    minHeight: '68%',
    paddingHorizontal: 24,
  },
  textMomentCaption: {
    ...typography.displayBold,
    fontSize: 28,
    lineHeight: 38,
    textAlign: 'center',
  },
});
