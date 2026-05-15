import { StyleSheet, View } from 'react-native';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';

export function EventTileGridSkeleton({ columns = 3, count = 6 }: { columns?: number; count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.tileWrap,
            {
              width: `${100 / columns}%`,
            },
          ]}
        >
          <SkeletonBlock style={styles.tile} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
  },
  tile: {
    aspectRatio: 1,
    borderRadius: 14,
    width: '100%',
  },
  tileWrap: {
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
});
