import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SkeletonBlock } from '@/components/skeleton/SkeletonBlock';
import {
  getProfileEventGridColumns,
  getProfileEventTileSize,
  PROFILE_EVENT_TILE_GRID_GAP,
} from '@/lib/events/eventTileGrid';

export function EventTileGridSkeleton({ columns, count = 6 }: { columns?: number; count?: number }) {
  const { width } = useWindowDimensions();
  const availableWidth = width - 40;
  const resolvedColumns = columns ?? getProfileEventGridColumns(availableWidth);
  const tileSize = getProfileEventTileSize(availableWidth, resolvedColumns);

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} style={[styles.tile, { width: tileSize }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PROFILE_EVENT_TILE_GRID_GAP,
  },
  tile: {
    aspectRatio: 1,
    borderRadius: 14,
  },
});
