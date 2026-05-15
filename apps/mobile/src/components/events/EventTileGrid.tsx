import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { ProfileEventTile } from '@/components/account/ProfileEventTile';

type EventTileGridProps = {
  columns?: number;
  occurrences: MobileEventOccurrence[];
  onPressEvent: (occurrence: MobileEventOccurrence) => void;
};

export function EventTileGrid({ columns = 3, occurrences, onPressEvent }: EventTileGridProps) {
  const { width } = useWindowDimensions();
  const tileSize = Math.floor((width - 40 - 6 * (columns - 1)) / columns);

  return (
    <View style={styles.grid}>
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
