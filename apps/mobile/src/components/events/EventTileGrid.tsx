import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { ProfileEventTile } from '@/components/account/ProfileEventTile';

type EventTileGridProps = {
  columns?: number;
  occurrences: MobileEventOccurrence[];
  onPressEvent: (occurrence: MobileEventOccurrence) => void;
};

export function EventTileGrid({ columns = 3, occurrences, onPressEvent }: EventTileGridProps) {
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const resolvedWidth = containerWidth ?? width - 40;
  const tileSize = useMemo(() => Math.floor((resolvedWidth - 6 * (columns - 1)) / columns), [columns, resolvedWidth]);

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
    gap: 6,
  },
});
