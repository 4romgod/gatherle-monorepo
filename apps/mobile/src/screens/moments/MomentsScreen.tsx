import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ViewToken } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { MomentFeedPage } from '@/components/moments/feed/MomentFeedPage';
import type { MobileMomentsFeedMoment } from '@data/graphql/query/EventMoment/types';
import { useMomentsFeed } from '@/hooks/moments/useMomentsFeed';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

export function MomentsScreen() {
  const { authToken } = useAppShell();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [pageHeight, setPageHeight] = useState(screenHeight);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenMomentIds, setHiddenMomentIds] = useState<string[]>([]);
  const { error, hasMore, isFetchingMore, loadMore, loading, moments, refresh } = useMomentsFeed(authToken, {
    enableAutoRefresh: isFocused,
  });
  const visibleMoments = useMemo(
    () => moments.filter((moment) => !hiddenMomentIds.includes(moment.momentId)),
    [hiddenMomentIds, moments],
  );
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

  if (loading && visibleMoments.length === 0) {
    return (
      <View style={[styles.centeredState, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.heroText} size="small" />
      </View>
    );
  }

  if (error && visibleMoments.length === 0) {
    return (
      <View style={[styles.centeredState, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.stateTitle, { color: theme.colors.heroText }]}>Moments are unavailable right now.</Text>
        <Text style={[styles.stateBody, { color: 'rgba(255,255,255,0.72)' }]}>Pull down to try again.</Text>
      </View>
    );
  }

  if (visibleMoments.length === 0) {
    return (
      <View style={[styles.centeredState, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.stateTitle, { color: theme.colors.textPrimary }]}>No moments yet</Text>
        <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>
          When people start posting from live events, they’ll show up here.
        </Text>
      </View>
    );
  }

  return (
    <View
      onLayout={(event) => {
        const nextHeight = Math.max(1, Math.round(event.nativeEvent.layout.height));
        if (nextHeight > 0 && nextHeight !== pageHeight) {
          setPageHeight(nextHeight);
        }
      }}
      style={[styles.screen]}
    >
      <FlatList
        data={visibleMoments}
        decelerationRate="fast"
        getItemLayout={(_data, index) => ({
          index,
          length: pageHeight,
          offset: pageHeight * index,
        })}
        keyExtractor={(item) => item.momentId}
        onEndReached={() => {
          if (hasMore) {
            void loadMore();
          }
        }}
        onEndReachedThreshold={0.6}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={() => {
              void refresh();
            }}
            progressBackgroundColor={theme.colors.surfaceRaised}
            refreshing={loading && visibleMoments.length > 0}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ index, item }) => (
          <MomentFeedPage
            active={isFocused && index === activeIndex}
            moment={item}
            onDeleted={(momentId) => {
              setHiddenMomentIds((current) => (current.includes(momentId) ? current : [...current, momentId]));
            }}
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
    flex: 1,
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
