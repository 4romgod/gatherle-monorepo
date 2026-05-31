import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewToken } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MainTabScreenLayout } from '@/app/navigation/MainTabScreenLayout';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { MomentFeedPage } from '@/components/moments/feed/MomentFeedPage';
import type { MobileMomentsFeedMoment } from '@data/graphql/query/EventMoment/types';
import { useMomentsFeed } from '@/hooks/moments/useMomentsFeed';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

export function MomentsScreen() {
  const { authToken, bottomTabBarHeight, mainTabsViewportHeight } = useAppShell();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<MobileMomentsFeedMoment> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenMomentIds, setHiddenMomentIds] = useState<string[]>([]);
  const pageHeight =
    mainTabsViewportHeight > bottomTabBarHeight ? mainTabsViewportHeight - bottomTabBarHeight : screenHeight;
  const activeIndexRef = useRef(0);
  const previousFocusRef = useRef(isFocused);
  const previousPageHeightRef = useRef(pageHeight);
  const previousVisibleLengthRef = useRef(0);
  const { error, hasMore, isFetchingMore, loadMore, loading, moments } = useMomentsFeed(authToken, {
    enableAutoRefresh: isFocused,
  });
  const visibleMoments = useMemo(
    () => moments.filter((moment) => !hiddenMomentIds.includes(moment.momentId)),
    [hiddenMomentIds, moments],
  );
  const chromeProps = { showToolbar: false as const };
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
  const snapToNearestPage = useCallback(
    (offsetY: number, animated: boolean) => {
      if (pageHeight <= 0 || visibleMoments.length === 0) {
        return;
      }

      const targetIndex = Math.min(Math.max(Math.round(offsetY / pageHeight), 0), visibleMoments.length - 1);
      const targetOffset = targetIndex * pageHeight;

      if (Math.abs(offsetY - targetOffset) <= 2) {
        if (activeIndexRef.current !== targetIndex) {
          activeIndexRef.current = targetIndex;
          setActiveIndex(targetIndex);
        }
        return;
      }

      activeIndexRef.current = targetIndex;
      setActiveIndex(targetIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          animated,
          offset: targetOffset,
        });
      });
    },
    [pageHeight, visibleMoments.length],
  );
  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapToNearestPage(event.nativeEvent.contentOffset.y, false);
    },
    [snapToNearestPage],
  );
  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Math.abs(event.nativeEvent.velocity?.y ?? 0) > 0.05) {
        return;
      }

      snapToNearestPage(event.nativeEvent.contentOffset.y, true);
    },
    [snapToNearestPage],
  );

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const focusRegained = isFocused && !previousFocusRef.current;
    const pageHeightChanged = pageHeight > 0 && previousPageHeightRef.current !== pageHeight;
    const visibleLengthChanged = visibleMoments.length !== previousVisibleLengthRef.current;

    previousFocusRef.current = isFocused;
    previousPageHeightRef.current = pageHeight;
    previousVisibleLengthRef.current = visibleMoments.length;

    if (!isFocused || visibleMoments.length === 0 || pageHeight <= 0) {
      return;
    }

    if (!focusRegained && !pageHeightChanged && !visibleLengthChanged) {
      return;
    }

    const targetIndex = Math.min(activeIndexRef.current, visibleMoments.length - 1);
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        animated: false,
        offset: pageHeight * targetIndex,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isFocused, pageHeight, visibleMoments.length]);

  if (loading && visibleMoments.length === 0) {
    return (
      <MainTabScreenLayout {...chromeProps}>
        <View style={[styles.centeredState, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator color={theme.colors.heroText} size="small" />
        </View>
      </MainTabScreenLayout>
    );
  }

  if (error && visibleMoments.length === 0) {
    return (
      <MainTabScreenLayout {...chromeProps}>
        <View style={[styles.centeredState, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.stateTitle, { color: theme.colors.heroText }]}>Moments are unavailable right now.</Text>
          <Text style={[styles.stateBody, { color: 'rgba(255,255,255,0.72)' }]}>
            We'll retry automatically in a moment.
          </Text>
        </View>
      </MainTabScreenLayout>
    );
  }

  if (visibleMoments.length === 0) {
    return (
      <MainTabScreenLayout {...chromeProps}>
        <View style={[styles.centeredState, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.stateTitle, { color: theme.colors.textPrimary }]}>No moments yet</Text>
          <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>
            When people start posting from live events, they’ll show up here.
          </Text>
        </View>
      </MainTabScreenLayout>
    );
  }

  return (
    <MainTabScreenLayout {...chromeProps}>
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <FlatList
          ref={listRef}
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
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollEndDrag={handleScrollEndDrag}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled
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
          snapToInterval={pageHeight}
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          style={styles.feed}
          viewabilityConfig={viewabilityConfig}
        />
        {isFetchingMore ? (
          <View style={styles.fetchingBadge}>
            <ActivityIndicator color={theme.colors.heroText} size="small" />
          </View>
        ) : null}
      </View>
    </MainTabScreenLayout>
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
