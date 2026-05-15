import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MobileEventMoment } from '@data/graphql/query/EventMoment/types';
import { EventMomentState, ParticipantStatus } from '@data/graphql/types/graphql';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography, fontSize } from '@/shared/theme/typography';
import { MomentAvatarBubble } from '@/components/moments/MomentAvatarBubble';
import { MomentViewer } from '@/components/moments/MomentViewer';

const ALLOWED_STATUSES = new Set<ParticipantStatus>([ParticipantStatus.Going, ParticipantStatus.CheckedIn]);

function groupMomentsByAuthor(moments: MobileEventMoment[]) {
  const groupedMoments = new Map<string, MobileEventMoment[]>();

  for (const moment of moments) {
    if (!groupedMoments.has(moment.authorId)) {
      groupedMoments.set(moment.authorId, []);
    }

    groupedMoments.get(moment.authorId)!.push(moment);
  }

  return Array.from(groupedMoments.values());
}

export function EventMomentsRing({
  moments,
  myRsvpStatus,
  onPressAddMoment,
}: {
  moments: MobileEventMoment[];
  myRsvpStatus: ParticipantStatus | null;
  onPressAddMoment: () => void;
}) {
  const { theme } = useAppTheme();
  const [viewerMoments, setViewerMoments] = useState<MobileEventMoment[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const groupedMoments = useMemo(() => groupMomentsByAuthor(moments), [moments]);
  const canPost = myRsvpStatus !== null && ALLOWED_STATUSES.has(myRsvpStatus);

  if (!canPost && groupedMoments.length === 0) {
    return null;
  }

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {canPost ? (
            <Pressable onPress={onPressAddMoment} style={styles.addShell}>
              <View
                style={[
                  styles.addBubble,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Text style={[styles.addSymbol, { color: theme.colors.primary }]}>+</Text>
              </View>
              <Text style={[styles.addLabel, { color: theme.colors.primary }]}>Your moment</Text>
            </Pressable>
          ) : null}

          {groupedMoments.map((authorMoments) => {
            const hasPending = authorMoments.some((moment) =>
              [EventMomentState.UploadPending, EventMomentState.Transcoding].includes(moment.state),
            );
            const hasFailed = !hasPending && authorMoments.some((moment) => moment.state === EventMomentState.Failed);

            return (
              <MomentAvatarBubble
                author={authorMoments[0]?.author}
                key={authorMoments[0]?.momentId}
                onPress={() => {
                  setViewerMoments(authorMoments);
                  setViewerOpen(true);
                }}
                variant={hasFailed ? 'failed' : hasPending ? 'pending' : 'active'}
              />
            );
          })}
        </View>
      </ScrollView>

      <MomentViewer moments={viewerMoments} onClose={() => setViewerOpen(false)} open={viewerOpen} startIndex={0} />
    </>
  );
}

const styles = StyleSheet.create({
  addBubble: {
    alignItems: 'center',
    borderRadius: 999,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    height: 67,
    width: 67,
  },
  addLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.sm,
    maxWidth: 76,
    textAlign: 'center',
  },
  addShell: {
    alignItems: 'center',
    gap: 6,
    width: 76,
  },
  addSymbol: {
    ...typography.displayBold,
    fontSize: 26,
    lineHeight: 28,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 2,
  },
});
