import { useState } from 'react';
import type { ListRenderItemInfo } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

type CarouselProps<ItemT> = {
  contentInset?: number;
  data: ItemT[];
  gap?: number;
  itemWidth: number;
  keyExtractor: (item: ItemT, index: number) => string;
  renderItem: (info: ListRenderItemInfo<ItemT>) => React.ReactElement;
};

export function Carousel<ItemT>({
  contentInset = 20,
  data,
  gap = 12,
  itemWidth,
  keyExtractor,
  renderItem,
}: CarouselProps<ItemT>) {
  const { theme } = useAppTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  if (data.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: contentInset }}
        data={data}
        decelerationRate="fast"
        disableIntervalMomentum
        horizontal
        keyExtractor={keyExtractor}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (itemWidth + gap));
          setActiveIndex(Math.max(0, Math.min(nextIndex, data.length - 1)));
        }}
        renderItem={(info) => <View style={{ width: itemWidth }}>{renderItem(info)}</View>}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={itemWidth + gap}
        style={[styles.list, { marginHorizontal: -contentInset }]}
        ItemSeparatorComponent={() => <View style={{ width: gap }} />}
      />

      {data.length > 1 ? (
        <View style={styles.dotsRow}>
          {data.map((_, index) => (
            <View
              key={`carousel-dot-${index}`}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeIndex ? theme.colors.primary : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 10,
  },
  list: {
    overflow: 'visible',
  },
  wrap: {
    gap: 2,
  },
});
