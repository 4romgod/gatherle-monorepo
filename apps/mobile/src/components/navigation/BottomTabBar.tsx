import { Feather } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { MOBILE_BOTTOM_TAB_BAR_HEIGHT } from '@/lib/constants/layout';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontFamily, fontSize } from '@/shared/theme/typography';
import type { MainTabParamList } from '@/app/navigation/routes';

const TAB_ICONS: Record<keyof MainTabParamList, React.ComponentProps<typeof Feather>['name']> = {
  Home: 'home',
  Events: 'calendar',
  Moments: 'play-circle',
  Messages: 'message-circle',
  Notifications: 'bell',
  Account: 'user',
};

type BottomTabBarProps = MaterialTopTabBarProps & {
  isTabletLayout: boolean;
};

export function BottomTabBar({ isTabletLayout, navigation, position, state }: BottomTabBarProps) {
  const { isAuthenticated, setBottomTabBarHeight, username } = useAppShell();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile } = usePreviewProfile(username, isAuthenticated);
  const profileLabel = getDisplayName(profile);

  return (
    <View
      onLayout={(event) => {
        const nextHeight = Math.round(event.nativeEvent.layout.height);
        if (nextHeight > 0) {
          setBottomTabBarHeight(nextHeight);
        }
      }}
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          minHeight: MOBILE_BOTTOM_TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const routeName = route.name as keyof MainTabParamList;
        const color = focused ? theme.colors.primary : theme.colors.textSecondary;

        const handlePress = () => {
          const event = navigation.emit({
            canPreventDefault: true,
            target: route.key,
            type: 'tabPress',
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const handleLongPress = () => {
          navigation.emit({
            target: route.key,
            type: 'tabLongPress',
          });
        };

        return (
          <Pressable
            accessibilityRole="button"
            key={route.key}
            onLongPress={handleLongPress}
            onPress={handlePress}
            style={({ pressed }) => [
              styles.item,
              isTabletLayout ? styles.itemTablet : styles.itemPhone,
              { opacity: pressed ? 0.84 : 1 },
            ]}
          >
            {routeName === 'Account' && isAuthenticated ? (
              <ProfileAvatar
                active={focused}
                imageUrl={profile?.profile_picture}
                label={profileLabel}
                size={focused ? 32 : 30}
              />
            ) : (
              <Feather color={color} name={TAB_ICONS[routeName]} size={23} />
            )}

            {isTabletLayout ? (
              <Text style={[styles.label, { color }]}>{route.name}</Text>
            ) : (
              <View style={[styles.indicator, { backgroundColor: focused ? theme.colors.primary : 'transparent' }]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    borderRadius: 999,
    height: 3,
    marginTop: 6,
    width: 14,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  itemPhone: {
    gap: 0,
    paddingTop: 6,
  },
  itemTablet: {
    gap: 6,
    paddingTop: 6,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.xs,
    paddingBottom: 4,
  },
  tabBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
  },
});
