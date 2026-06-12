import { Feather } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { useUnreadChatCount } from '@/hooks/messages/useMessages';
import { useUnreadNotificationCount } from '@/hooks/notifications/useNotifications';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { MOBILE_BOTTOM_TAB_BAR_HEIGHT, getResponsiveContentContainerWidth } from '@/lib/constants/layout';
import { getDisplayName } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontFamily, fontSize } from '@/app/theme/typography';
import type { MainTabParamList } from '@/app/navigation/routes';

const TAB_ICONS: Record<keyof MainTabParamList, React.ComponentProps<typeof Feather>['name']> = {
  Home: 'home',
  Events: 'calendar',
  Moments: 'image',
  Messages: 'message-circle',
  Notifications: 'bell',
  Account: 'user',
};

type BottomTabBarProps = MaterialTopTabBarProps & {
  isTabletLayout: boolean;
};

export function BottomTabBar({ isTabletLayout, navigation, state }: BottomTabBarProps) {
  const { authToken, isAuthenticated, setBottomTabBarHeight, userId } = useAppShell();
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);
  const tabRailWidth = isTabletLayout ? getResponsiveContentContainerWidth(width) : width;
  const { profile } = usePreviewProfile(userId, authToken, isAuthenticated);
  const profileLabel = getDisplayName(profile);
  const { unreadCount: unreadMessages } = useUnreadChatCount(authToken, isAuthenticated);
  const { unreadCount: unreadNotifications } = useUnreadNotificationCount(authToken, isAuthenticated);

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
          borderTopColor: theme.colors.surfaceRaised,
          minHeight: MOBILE_BOTTOM_TAB_BAR_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 4,
        },
      ]}
    >
      <View style={[styles.tabBarRow, isTabletLayout ? { maxWidth: tabRailWidth } : null]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const routeName = route.name as keyof MainTabParamList;
          const color = focused ? theme.colors.primary : theme.colors.textSecondary;
          const tabBadgeCount =
            routeName === 'Messages' ? unreadMessages : routeName === 'Notifications' ? unreadNotifications : 0;

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
                <View style={styles.iconWrap}>
                  <Feather color={color} name={TAB_ICONS[routeName]} size={23} />
                  {tabBadgeCount > 0 ? (
                    <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                      <Text style={[styles.badgeText, { color: theme.colors.primaryContrast }]}>
                        {tabBadgeCount > 99 ? '99+' : tabBadgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    minHeight: 16,
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -10,
    top: -5,
  },
  badgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    lineHeight: 16,
  },
  indicator: {
    borderRadius: 999,
    height: 3,
    marginTop: 3,
    width: 14,
  },
  iconWrap: {
    position: 'relative',
  },
  item: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  itemPhone: {
    gap: 0,
    paddingTop: 3,
  },
  itemTablet: {
    gap: 6,
    paddingTop: 3,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.xs,
    paddingBottom: 4,
  },
  tabBar: {
    alignItems: 'center',
    borderTopWidth: 0.2,
    flexDirection: 'row',
  },
  tabBarRow: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
});
