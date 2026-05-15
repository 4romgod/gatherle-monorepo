import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { MobileFollowedMoment } from '@data/graphql/query/EventMoment/types';
import { EventMomentState } from '@data/graphql/types/graphql';
import { MomentAvatarBubble } from '@/components/moments/MomentAvatarBubble';
import { MomentViewer } from '@/components/moments/MomentViewer';

function groupMomentsByAuthor(moments: MobileFollowedMoment[]) {
  const groupedMoments = new Map<string, MobileFollowedMoment[]>();

  for (const moment of moments) {
    if (moment.state !== EventMomentState.Ready) {
      continue;
    }

    if (!groupedMoments.has(moment.authorId)) {
      groupedMoments.set(moment.authorId, []);
    }

    groupedMoments.get(moment.authorId)!.push(moment);
  }

  return Array.from(groupedMoments.values());
}

export function FollowedMomentsStrip({ moments }: { moments: MobileFollowedMoment[] }) {
  const [viewerMoments, setViewerMoments] = useState<MobileFollowedMoment[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const groupedMoments = useMemo(() => groupMomentsByAuthor(moments), [moments]);

  if (groupedMoments.length === 0) {
    return null;
  }

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {groupedMoments.map((authorMoments) => (
            <MomentAvatarBubble
              author={authorMoments[0]?.author}
              key={authorMoments[0]?.momentId}
              onPress={() => {
                setViewerMoments(authorMoments);
                setViewerOpen(true);
              }}
            />
          ))}
        </View>
      </ScrollView>
      <MomentViewer moments={viewerMoments} onClose={() => setViewerOpen(false)} open={viewerOpen} startIndex={0} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 6,
    paddingTop: 2,
  },
});
