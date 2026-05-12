import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComponentProps } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BrandMark } from '../components/BrandMark';
import { HeaderMenuButton } from '../components/HeaderMenuButton';
import { ProfileAvatar } from '../components/ProfileAvatar';
import {
  AccountScreen,
  DetailPlaceholderScreen,
  EventsScreen,
  HomeScreen,
  MessagesScreen,
  NotificationsScreen,
} from '../screens/AppScreens';
import { useAppShell } from '../shell/AppShellProvider';
import { useAppTheme } from '../theme/AppThemeProvider';
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
  const { isAuthenticated, mockUser } = useAppShell();
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= TABLET_BREAKPOINT;

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
          fontSize: 18,
          fontWeight: '700',
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarShowLabel: isTabletLayout,
        tabBarItemStyle: {
          paddingTop: isTabletLayout ? 6 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
            return <ProfileAvatar active={focused} size={focused ? 32 : 30} user={mockUser} />;
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
          fontSize: 18,
          fontWeight: '700',
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
