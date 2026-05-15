import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';

type SectionHeadingSkeletonProps = {
  actionWidth?: number;
  titleWidth?: number;
};

export function SectionHeadingSkeleton({ actionWidth = 96, titleWidth = 176 }: SectionHeadingSkeletonProps) {
  return (
    <View style={styles.row}>
      <SkeletonBlock style={[styles.title, { width: titleWidth }]} />
      <SkeletonBlock style={[styles.action, { width: actionWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    height: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    height: 18,
  },
});
