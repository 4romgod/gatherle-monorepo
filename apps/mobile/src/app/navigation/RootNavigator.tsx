import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComponentProps } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BrandMark } from '@/components/core/BrandMark';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { HeaderMenuButton } from '@/components/navigation/HeaderMenuButton';
import { DetailPlaceholderScreen } from '@/app/screens/DetailPlaceholderScreen';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { getDisplayName } from '@/lib/events/formatters';
import { AccountScreen } from '@/screens/account/AccountScreen';
import { EventsScreen } from '@/screens/events/EventsScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { MessagesScreen } from '@/screens/messages/MessagesScreen';
import { NotificationsScreen } from '@/screens/notifications/NotificationsScreen';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontFamily, fontSize } from '@/shared/theme/typography';
import {
  DetailRouteName,
  MainTabParamList,
  RootStackParamList,
  authRouteNames,
  detailRouteNames,
  detailScreenContent,
} from './routes';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const TABLET_BREAKPOINT = 768;

const TAB_ICONS: Record<keyof MainTabParamList, ComponentProps<typeof Feather>['name']> = {
  Home: 'home',
  Events: 'calendar',
  Messages: 'message-circle',
  Notifications: 'bell',
  Account: 'user',
};

function MainTabs() {
  const { theme } = useAppTheme();
  const { isAuthenticated, previewUsername } = useAppShell();
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= TABLET_BREAKPOINT;
  const { profile } = usePreviewProfile(previewUsername, isAuthenticated);
  const profileLabel = getDisplayName(profile);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerLeft: () => (
          <View style={styles.headerLeftWrap}>
            <BrandMark />
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRightWrap}>
            <HeaderMenuButton />
          </View>
        ),
        headerShadowVisible: false,
        headerTitle: '',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          color: theme.colors.textPrimary,
          fontFamily: fontFamily.bodyBold,
          fontSize: 18,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarShowLabel: isTabletLayout,
        tabBarItemStyle: {
          paddingTop: isTabletLayout ? 6 : 10,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.bodySemiBold,
          fontSize: fontSize.xs,
          paddingBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          height: isTabletLayout ? 74 : 68,
          paddingTop: isTabletLayout ? 4 : 6,
        },
        tabBarIcon: ({ color, focused, size }) => {
          if (route.name === 'Account' && isAuthenticated) {
            return (
              <ProfileAvatar
                active={focused}
                imageUrl={profile?.profile_picture}
                label={profileLabel}
                size={focused ? 32 : 30}
              />
            );
          }

          return <Feather color={color} name={TAB_ICONS[route.name]} size={size} />;
        },
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" options={{ title: 'Home' }} />
      <Tab.Screen component={EventsScreen} name="Events" options={{ title: 'Events' }} />
      <Tab.Screen component={MessagesScreen} name="Messages" options={{ title: 'Messages' }} />
      <Tab.Screen component={NotificationsScreen} name="Notifications" options={{ title: 'Notifications' }} />
      <Tab.Screen component={AccountScreen} name="Account" options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

function isAuthRoute(routeName: DetailRouteName) {
  return authRouteNames.includes(routeName);
}

export function RootNavigator() {
  const { theme } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        headerRight: () => (
          <View style={styles.headerRightWrap}>
            <HeaderMenuButton />
          </View>
        ),
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          color: theme.colors.textPrimary,
          fontFamily: fontFamily.bodyBold,
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen component={MainTabs} name="MainTabs" options={{ headerShown: false }} />
      {detailRouteNames.map((routeName) => (
        <Stack.Screen
          key={routeName}
          name={routeName}
          options={{
            presentation: isAuthRoute(routeName) ? 'modal' : 'card',
            title: detailScreenContent[routeName].title,
          }}
        >
          {() => <DetailPlaceholderScreen screenKey={routeName} />}
        </Stack.Screen>
      ))}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLeftWrap: {
    marginLeft: 18,
  },
  headerRightWrap: {
    marginRight: 18,
  },
});
