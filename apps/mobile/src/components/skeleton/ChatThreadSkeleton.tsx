import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from './SkeletonBlock';

export function ChatThreadSkeleton() {
  return (
    <View style={styles.thread}>
      <SkeletonBlock style={styles.dayLabel} />

      <View style={styles.incomingWrap}>
        <SkeletonBlock style={styles.incomingBubble} />
        <SkeletonBlock style={styles.time} />
      </View>

      <View style={styles.outgoingWrap}>
        <SkeletonBlock style={styles.outgoingBubble} />
        <SkeletonBlock style={styles.time} />
      </View>

      <View style={styles.incomingWrap}>
        <SkeletonBlock style={styles.incomingBubbleShort} />
        <SkeletonBlock style={styles.time} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayLabel: {
    alignSelf: 'center',
    height: 12,
    marginBottom: 8,
    width: 84,
  },
  incomingBubble: {
    borderRadius: 15,
    height: 34,
    width: '58%',
  },
  incomingBubbleShort: {
    borderRadius: 15,
    height: 34,
    width: '36%',
  },
  incomingWrap: {
    alignItems: 'flex-start',
    gap: 4,
  },
  outgoingBubble: {
    borderRadius: 15,
    height: 34,
    width: '42%',
  },
  outgoingWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  thread: {
    gap: 14,
  },
  time: {
    height: 10,
    width: 54,
  },
});
