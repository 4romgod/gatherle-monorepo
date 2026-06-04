import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { DEVICE_STORAGE_KEYS } from '@/lib/deviceStorage';
import { usePersistedTabKey } from '@/hooks/core/usePersistedTabKey';

export type SwipePagerTabRoute = {
  count?: number;
  icon?: React.ComponentProps<typeof Feather>['name'];
  key: string;
  label: string;
  render: () => React.ReactNode;
};

type SwipePagerTabsProps = {
  initialKey?: string;
  onActiveKeyChange?: (key: string) => void;
  persistenceKey?: string;
  routes: SwipePagerTabRoute[];
  scrollableTabs?: boolean;
  variant?: 'icon' | 'label';
};

export function SwipePagerTabs({
  initialKey,
  onActiveKeyChange,
  persistenceKey,
  routes,
  scrollableTabs = false,
  variant = 'icon',
}: SwipePagerTabsProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<RNScrollView>(null);
  const tabsRef = useRef<RNScrollView>(null);
  const hasScrolledToPersistedKeyRef = useRef(false);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const previousPersistedKeyRef = useRef<string | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [tabLayouts, setTabLayouts] = useState<Record<string, { width: number; x: number }>>({});
  const [containerWidth, setContainerWidth] = useState(width);
  const pageWidth = containerWidth || width;
  const routeKeys = useMemo(() => routes.map((route) => route.key), [routes]);
  const { activeKey, isHydrated, setActiveKey } = usePersistedTabKey({
    availableKeys: routeKeys,
    initialKey,
    storageKey: persistenceKey ? `${DEVICE_STORAGE_KEYS.tabSelection}:${persistenceKey}` : null,
  });
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = routes.findIndex((route) => route.key === activeKey);
    return index >= 0 ? index : 0;
  });

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const nextIndex = routes.findIndex((route) => route.key === activeKey);
    if (nextIndex < 0 || previousPersistedKeyRef.current === activeKey) {
      return;
    }

    previousPersistedKeyRef.current = activeKey;
    setActiveIndex(nextIndex);

    const nextScrollX = pageWidth * nextIndex;
    const shouldAnimate = hasScrolledToPersistedKeyRef.current;
    pendingScrollIndexRef.current = shouldAnimate ? nextIndex : null;
    pagerRef.current?.scrollTo({ animated: shouldAnimate, x: nextScrollX });
    hasScrolledToPersistedKeyRef.current = true;
  }, [activeKey, isHydrated, pageWidth, routes]);

  useEffect(() => {
    if (!isHydrated || !activeKey) {
      return;
    }

    if (activeKey) {
      onActiveKeyChange?.(activeKey);
    }
  }, [activeKey, isHydrated, onActiveKeyChange]);

  useEffect(() => {
    if (!scrollableTabs) {
      return;
    }

    const activeRoute = routes[activeIndex];
    const layout = activeRoute ? tabLayouts[activeRoute.key] : null;
    if (!layout) {
      return;
    }

    const targetX = Math.max(layout.x - Math.max((containerWidth - layout.width) / 2, 24), 0);
    tabsRef.current?.scrollTo({ animated: true, x: targetX });
  }, [activeIndex, containerWidth, routes, scrollableTabs, tabLayouts]);

  const pagerHeight = routes.reduce((maxHeight, route) => Math.max(maxHeight, measuredHeights[route.key] ?? 0), 0);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(
      0,
      Math.min(Math.round(event.nativeEvent.contentOffset.x / pageWidth), routes.length - 1),
    );
    const pendingScrollIndex = pendingScrollIndexRef.current;

    if (pendingScrollIndex !== null && nextIndex !== pendingScrollIndex) {
      return;
    }

    pendingScrollIndexRef.current = null;
    const nextRoute = routes[nextIndex];
    if (!nextRoute) {
      return;
    }

    setActiveIndex(nextIndex);
    previousPersistedKeyRef.current = nextRoute.key;
    setActiveKey(nextRoute.key);
  };

  const handleTabPress = (index: number) => {
    const nextRoute = routes[index];
    if (!nextRoute) {
      return;
    }

    setActiveIndex(index);
    previousPersistedKeyRef.current = nextRoute.key;
    pendingScrollIndexRef.current = index;
    setActiveKey(nextRoute.key);
    pagerRef.current?.scrollTo({ animated: true, x: pageWidth * index });
  };

  const handleLayout = (key: string) => (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setMeasuredHeights((current) => (current[key] === nextHeight ? current : { ...current, [key]: nextHeight }));
  };

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    if (!nextWidth || nextWidth === containerWidth) {
      return;
    }

    setContainerWidth(nextWidth);
    requestAnimationFrame(() => {
      pendingScrollIndexRef.current = null;
      pagerRef.current?.scrollTo({ animated: false, x: nextWidth * activeIndex });
    });
  };

  const handleTabLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { width: nextWidth, x: nextX } = event.nativeEvent.layout;
    setTabLayouts((current) => {
      const previous = current[key];
      if (previous && previous.width === nextWidth && previous.x === nextX) {
        return current;
      }

      return {
        ...current,
        [key]: {
          width: Math.ceil(nextWidth),
          x: Math.ceil(nextX),
        },
      };
    });
  };

  const formatTabCount = (count: number) => {
    if (count > 99) {
      return '99+';
    }

    return String(count);
  };

  const tabButtons = routes.map((route, index) => {
    const active = activeIndex === index;

    return (
      <Pressable
        accessibilityLabel={`${route.label}${typeof route.count === 'number' ? `, ${formatTabCount(route.count)}` : ''}`}
        accessibilityRole="button"
        key={route.key}
        onLayout={scrollableTabs ? handleTabLayout(route.key) : undefined}
        onPress={() => handleTabPress(index)}
        style={({ pressed }) => [
          styles.tabButtonBase,
          scrollableTabs ? styles.tabButtonScrollable : styles.tabButtonFlexible,
          { opacity: pressed ? 0.84 : 1 },
          variant === 'icon' ? styles.iconButton : styles.labelButton,
        ]}
      >
        {variant === 'icon' && route.icon ? (
          <>
            <View style={styles.iconFrame}>
              <Feather color={active ? theme.colors.primary : theme.colors.textSecondary} name={route.icon} size={18} />
              {typeof route.count === 'number' ? (
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: active ? theme.colors.surfaceMuted : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.iconBadgeText,
                      { color: active ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    {formatTabCount(route.count)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[styles.iconLabelText, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}
            >
              {route.label}
            </Text>
          </>
        ) : (
          <Text style={[styles.labelText, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}>
            {route.label}
          </Text>
        )}
        <View
          style={[
            styles.underline,
            {
              backgroundColor: active ? theme.colors.primary : 'transparent',
              width: variant === 'icon' ? 56 : '100%',
            },
          ]}
        />
      </Pressable>
    );
  });

  return (
    <View onLayout={handleContainerLayout} style={styles.wrap}>
      {scrollableTabs ? (
        <ScrollView
          horizontal
          ref={tabsRef}
          showsHorizontalScrollIndicator={false}
          style={[
            styles.tabRow,
            variant === 'label' ? styles.labelTabRow : null,
            { borderBottomColor: theme.colors.border },
          ]}
          contentContainerStyle={styles.tabRowScrollableContent}
        >
          {tabButtons}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.tabRow,
            variant === 'label' ? styles.labelTabRow : null,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          {tabButtons}
        </View>
      )}

      <ScrollView
        horizontal
        onMomentumScrollEnd={onMomentumScrollEnd}
        pagingEnabled
        ref={pagerRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={[styles.pager, pagerHeight > 0 ? { minHeight: pagerHeight } : null]}
      >
        {routes.map((route) => (
          <View key={route.key} onLayout={handleLayout(route.key)} style={[styles.page, { width: pageWidth }]}>
            {route.render()}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    gap: 6,
    paddingBottom: 8,
    paddingTop: 8,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    position: 'absolute',
    right: -16,
    top: -9,
  },
  iconBadgeText: {
    ...typography.bodyBold,
    fontSize: 10,
    lineHeight: 12,
  },
  iconFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
    position: 'relative',
  },
  iconLabelText: {
    ...typography.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  labelButton: {
    gap: 8,
  },
  labelTabRow: {
    marginTop: -10,
  },
  labelText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  tabButtonBase: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabButtonFlexible: {
    flex: 1,
  },
  tabButtonScrollable: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 88,
    paddingHorizontal: 14,
  },
  page: {
    alignSelf: 'flex-start',
    paddingTop: 22,
  },
  pager: {
    overflow: 'hidden',
  },
  tabRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tabRowScrollableContent: {
    alignItems: 'stretch',
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  underline: {
    borderRadius: 999,
    height: 2.5,
  },
  wrap: {
    gap: 0,
  },
});
