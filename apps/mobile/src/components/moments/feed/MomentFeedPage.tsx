import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLazyQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { EventMomentType } from '@data/graphql/types/graphql';
import { GetEventsDocument } from '@data/graphql/query/Event/query';
import type { MobileMomentsFeedMoment } from '@data/graphql/query/EventMoment/types';
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

function resolveBackgroundColor(token?: string | null): string {
  return MOMENT_BACKGROUND_SWATCHES.find((swatch) => swatch.token === token)?.color ?? '#9333ea';
}

export function MomentFeedPage({
  active,
  bottomOverlayOffset,
  moment,
  pageHeight,
}: {
  active: boolean;
  bottomOverlayOffset: number;
  moment: MobileMomentsFeedMoment;
  pageHeight: number;
}) {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, userId: viewerUserId } = useAppShell();
  const { theme } = useAppTheme();
  const { isConnected, sendChatMessage } = useChatRealtime({
    enabled: Boolean(viewerUserId),
  });
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isMediaReady, setMediaReady] = useState(moment.type === EventMomentType.Text);
  const [hasMediaError, setMediaError] = useState(false);
  const [loadLinkedEvent] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
    ...getApolloAuthContext(authToken),
  });
  const videoSource = moment.type === EventMomentType.Video && moment.mediaUrl ? { uri: moment.mediaUrl } : null;
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.muted = true;
  });
  const authorUserId = moment.author?.userId ?? moment.authorId;
  const displayName = useMemo(() => getDisplayName(moment.author), [moment.author]);
  const targetUserId = authorUserId && authorUserId !== viewerUserId ? authorUserId : undefined;

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

  useEffect(() => {
    setMenuOpen(false);
    setMediaError(false);
    setMediaReady(moment.type === EventMomentType.Text);
  }, [moment.background, moment.mediaUrl, moment.momentId, moment.type]);

  useEffect(() => {
    if (!videoSource) {
      return;
    }

    if (!active) {
      videoPlayer.pause();
      videoPlayer.currentTime = 0;
      return;
    }

    videoPlayer.play();

    return () => {
      videoPlayer.pause();
    };
  }, [active, videoPlayer, videoSource]);

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

  const backgroundColor = moment.type === EventMomentType.Text ? resolveBackgroundColor(moment.background) : '#020617';

  return (
    <View style={[styles.page, { backgroundColor, height: pageHeight }]}>
      {isMenuOpen ? <Pressable onPress={() => setMenuOpen(false)} style={styles.menuBackdrop} /> : null}

      <View style={styles.topGradient} pointerEvents="none" />
      <View style={styles.bottomGradient} pointerEvents="none" />

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
        </View>
      ) : null}

      <View style={styles.content}>
        {moment.type === EventMomentType.Image && moment.mediaUrl ? (
          <>
            <Image
              onError={() => {
                setMediaError(true);
                setMediaReady(true);
              }}
              onLoadEnd={() => setMediaReady(true)}
              resizeMode="cover"
              source={{ uri: moment.mediaUrl }}
              style={styles.media}
            />
            {moment.caption ? (
              <Text style={[styles.caption, { color: theme.colors.heroText }]}>{moment.caption}</Text>
            ) : null}
          </>
        ) : null}

        {moment.type === EventMomentType.Video && moment.mediaUrl ? (
          <>
            <VideoView contentFit="cover" player={videoPlayer} style={styles.media} />
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

      <View style={[styles.footer, { bottom: bottomOverlayOffset + 10 }]}>
        <ChatComposer
          isConnected={isConnected}
          onSend={handleReply}
          placeholder={targetUserId ? `Reply to ${moment.author?.username ?? displayName}...` : 'Your moment'}
          showStatus={false}
          targetUserId={targetUserId}
          variant="overlay"
        />
      </View>
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
    bottom: 144,
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
    top: 18,
    zIndex: 3,
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
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject,
  },
  media: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 2,
    padding: 8,
    position: 'absolute',
    right: 14,
    top: 58,
    zIndex: 4,
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
  topGradient: {
    backgroundColor: 'rgba(2,6,23,0.58)',
    height: 140,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
});
