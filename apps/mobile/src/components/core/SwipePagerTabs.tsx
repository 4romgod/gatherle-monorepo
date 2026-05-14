import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontSize, typography } from '@/shared/theme/typography';

export type SwipePagerTabRoute = {
  icon?: React.ComponentProps<typeof Feather>['name'];
  key: string;
  label: string;
  render: () => React.ReactNode;
};

type SwipePagerTabsProps = {
  initialKey?: string;
  routes: SwipePagerTabRoute[];
  variant?: 'icon' | 'label';
};

export function SwipePagerTabs({ initialKey, routes, variant = 'icon' }: SwipePagerTabsProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<RNScrollView>(null);
  const routeIndex = useMemo(() => routes.findIndex((route) => route.key === initialKey), [initialKey, routes]);
  const [activeIndex, setActiveIndex] = useState(routeIndex >= 0 ? routeIndex : 0);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (routeIndex < 0 || routeIndex === activeIndex) {
      return;
    }

    setActiveIndex(routeIndex);
    pagerRef.current?.scrollTo({ animated: false, x: width * routeIndex });
  }, [activeIndex, routeIndex, width]);

  const pagerHeight = routes.reduce((maxHeight, route) => Math.max(maxHeight, measuredHeights[route.key] ?? 0), 0);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(nextIndex, routes.length - 1)));
  };

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    pagerRef.current?.scrollTo({ animated: true, x: width * index });
  };

  const handleLayout = (key: string) => (event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setMeasuredHeights((current) => (current[key] === nextHeight ? current : { ...current, [key]: nextHeight }));
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.tabRow, { borderBottomColor: theme.colors.border }]}>
        {routes.map((route, index) => {
          const active = activeIndex === index;

          return (
            <Pressable
              accessibilityRole="button"
              key={route.key}
              onPress={() => handleTabPress(index)}
              style={({ pressed }) => [
                styles.tabButton,
                { opacity: pressed ? 0.84 : 1 },
                variant === 'icon' ? styles.iconButton : styles.labelButton,
              ]}
            >
              {variant === 'icon' && route.icon ? (
                <View
                  style={[
                    styles.iconFrame,
                    {
                      backgroundColor: active ? theme.colors.primarySoft : 'transparent',
                      borderColor: active ? theme.colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Feather
                    color={active ? theme.colors.primary : theme.colors.textSecondary}
                    name={route.icon}
                    size={19}
                  />
                </View>
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
        })}
      </View>

      <ScrollView
        horizontal
        onMomentumScrollEnd={onMomentumScrollEnd}
        pagingEnabled
        ref={pagerRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={[styles.pager, pagerHeight > 0 ? { height: pagerHeight } : null]}
      >
        {routes.map((route) => (
          <View key={route.key} onLayout={handleLayout(route.key)} style={[styles.page, { width }]}>
            {route.render()}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    gap: 10,
  },
  iconFrame: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 46,
  },
  labelButton: {
    gap: 8,
  },
  labelText: {
    ...typography.bodySemiBold,
    fontSize: fontSize.sm,
  },
  page: {
    paddingTop: 14,
  },
  pager: {
    overflow: 'visible',
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
  },
  tabRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: -10,
  },
  underline: {
    borderRadius: 999,
    height: 2.5,
  },
  wrap: {
    gap: 0,
  },
});
