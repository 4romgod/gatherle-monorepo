import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ViewToken } from 'react-native';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { MomentFeedPage } from '@/components/moments/feed/MomentFeedPage';
import type { MobileMomentsFeedMoment } from '@data/graphql/query/EventMoment/types';
import { MOBILE_BOTTOM_TAB_BAR_HEIGHT } from '@/lib/constants/layout';
import { useMomentsFeed } from '@/hooks/moments/useMomentsFeed';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

export function MomentsScreen() {
  const { authToken } = useAppShell();
  const { theme } = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [pageHeight, setPageHeight] = useState(screenHeight);
  const [activeIndex, setActiveIndex] = useState(0);
  const { error, fetchNextPage, hasMore, isFetchingMore, loading, moments, refetch } = useMomentsFeed(authToken);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<MobileMomentsFeedMoment>[] }) => {
      const firstVisibleIndex = viewableItems[0]?.index;
      if (typeof firstVisibleIndex === 'number') {
        setActiveIndex(firstVisibleIndex);
      }
    },
  ).current;
  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 80,
    }),
    [],
  );

  if (loading && moments.length === 0) {
    return (
      <View style={[styles.centeredState, { backgroundColor: '#020617' }]}>
        <ActivityIndicator color={theme.colors.heroText} size="small" />
      </View>
    );
  }

  if (error && moments.length === 0) {
    return (
      <View style={[styles.centeredState, { backgroundColor: '#020617' }]}>
        <Text style={[styles.stateTitle, { color: theme.colors.heroText }]}>Moments are unavailable right now.</Text>
        <Text style={[styles.stateBody, { color: 'rgba(255,255,255,0.72)' }]}>Pull down to try again.</Text>
      </View>
    );
  }

  if (moments.length === 0) {
    return (
      <View style={[styles.centeredState, { backgroundColor: '#020617' }]}>
        <Text style={[styles.stateTitle, { color: theme.colors.heroText }]}>No moments yet.</Text>
        <Text style={[styles.stateBody, { color: 'rgba(255,255,255,0.72)' }]}>
          When people start posting from live events, they’ll show up here.
        </Text>
      </View>
    );
  }

  return (
    <View
      onLayout={(event) => {
        const nextHeight = Math.max(1, Math.round(event.nativeEvent.layout.height + MOBILE_BOTTOM_TAB_BAR_HEIGHT));
        if (nextHeight > 0 && nextHeight !== pageHeight) {
          setPageHeight(nextHeight);
        }
      }}
      style={[styles.screen, { backgroundColor: '#020617' }]}
    >
      <FlatList
        data={moments}
        decelerationRate="fast"
        getItemLayout={(_data, index) => ({
          index,
          length: pageHeight,
          offset: pageHeight * index,
        })}
        keyExtractor={(item) => item.momentId}
        onEndReached={() => {
          if (hasMore) {
            void fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={() => {
              void refetch();
            }}
            progressBackgroundColor={theme.colors.surfaceRaised}
            refreshing={loading && moments.length > 0}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ index, item }) => (
          <MomentFeedPage
            active={index === activeIndex}
            bottomOverlayOffset={MOBILE_BOTTOM_TAB_BAR_HEIGHT}
            moment={item}
            pageHeight={pageHeight}
          />
        )}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        style={styles.feed}
      />
      {isFetchingMore ? (
        <View style={styles.fetchingBadge}>
          <ActivityIndicator color={theme.colors.heroText} size="small" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  fetchingBadge: {
    alignItems: 'center',
    paddingBottom: 10,
    position: 'absolute',
    right: 0,
    top: 18,
    width: '100%',
  },
  feed: {
    marginBottom: -MOBILE_BOTTOM_TAB_BAR_HEIGHT,
  },
  screen: {
    flex: 1,
  },
  stateBody: {
    ...typography.bodyRegular,
    fontSize: fontSize.lg,
    lineHeight: 28,
    maxWidth: 320,
    textAlign: 'center',
  },
  stateTitle: {
    ...typography.displayBold,
    fontSize: 30,
    marginBottom: 10,
    textAlign: 'center',
  },
});
