import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { ProfileEventTile } from '@/components/account/ProfileEventTile';
import {
  getProfileEventGridColumns,
  getProfileEventTileSize,
  PROFILE_EVENT_TILE_GRID_GAP,
} from '@/lib/events/eventTileGrid';
import { getResponsiveContentWidth } from '@/lib/constants/layout';

type EventTileGridProps = {
  columns?: number;
  occurrences: MobileEventOccurrence[];
  onPressEvent: (occurrence: MobileEventOccurrence) => void;
};

export function EventTileGrid({ columns, occurrences, onPressEvent }: EventTileGridProps) {
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const resolvedWidth = containerWidth ?? getResponsiveContentWidth(width);
  const resolvedColumns = columns ?? getProfileEventGridColumns(resolvedWidth);
  const tileSize = useMemo(
    () => getProfileEventTileSize(resolvedWidth, resolvedColumns),
    [resolvedColumns, resolvedWidth],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs((containerWidth ?? 0) - nextWidth) > 1) {
      setContainerWidth(nextWidth);
    }
  };

  return (
    <View onLayout={handleLayout} style={styles.grid}>
      {occurrences.map((occurrence) => (
        <ProfileEventTile
          key={occurrence.occurrenceId}
          occurrence={occurrence}
          onPress={() => onPressEvent(occurrence)}
          size={tileSize}
        />
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
});
