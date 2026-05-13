import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ComponentProps } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { navigationRef } from '@/app/navigation/navigationRef';
import { BrandMark } from '@/components/core/BrandMark';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { HeaderMenuButton } from '@/components/navigation/HeaderMenuButton';
import { DetailPlaceholderScreen } from '@/app/screens/DetailPlaceholderScreen';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { LoginProvidersScreen } from '@/features/auth/screens/LoginProvidersScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { VerifyEmailScreen } from '@/features/auth/screens/VerifyEmailScreen';
import { VerifyPendingScreen } from '@/features/auth/screens/VerifyPendingScreen';
import { EditProfileScreen } from '@/screens/account/EditProfileScreen';
import { usePreviewProfile } from '@/hooks/session/usePreviewProfile';
import { getDisplayName } from '@/lib/events/formatters';
import { AccountScreen } from '@/screens/account/AccountScreen';
import { SettingsScreen } from '@/screens/account/SettingsScreen';
import { EventDetailsScreen } from '@/screens/events/EventDetailsScreen';
import { EventsScreen } from '@/screens/events/EventsScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { MessageThreadScreen } from '@/screens/messages/MessageThreadScreen';
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
const PROTECTED_TABS: Array<keyof MainTabParamList> = ['Messages', 'Notifications', 'Account'];

const TAB_ICONS: Record<keyof MainTabParamList, ComponentProps<typeof Feather>['name']> = {
  Home: 'home',
  Events: 'calendar',
  Messages: 'message-circle',
  Notifications: 'bell',
  Account: 'user',
};

function openLoginForProtectedTab(routeName: keyof MainTabParamList) {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate('Login', { redirectTab: routeName });
}

function MainTabs() {
  const { theme } = useAppTheme();
  const { isAuthenticated, username } = useAppShell();
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= TABLET_BREAKPOINT;
  const { profile } = usePreviewProfile(username, isAuthenticated);
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
      <Tab.Screen
        component={MessagesScreen}
        name="Messages"
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (isAuthenticated || !PROTECTED_TABS.includes(route.name)) {
              return;
            }

            event.preventDefault();
            openLoginForProtectedTab(route.name);
          },
        })}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        component={NotificationsScreen}
        name="Notifications"
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (isAuthenticated || !PROTECTED_TABS.includes(route.name)) {
              return;
            }

            event.preventDefault();
            openLoginForProtectedTab(route.name);
          },
        })}
        options={{ title: 'Notifications' }}
      />
      <Tab.Screen
        component={AccountScreen}
        name="Account"
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (isAuthenticated || !PROTECTED_TABS.includes(route.name)) {
              return;
            }

            event.preventDefault();
            openLoginForProtectedTab(route.name);
          },
        })}
        options={{ title: 'Account' }}
      />
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
      <Stack.Screen component={LoginProvidersScreen} name="Login" options={{ presentation: 'modal', title: 'Login' }} />
      <Stack.Screen component={LoginScreen} name="EmailLogin" options={{ presentation: 'modal', title: 'Login' }} />
      <Stack.Screen component={RegisterScreen} name="Register" options={{ presentation: 'modal', title: 'Register' }} />
      <Stack.Screen
        component={ForgotPasswordScreen}
        name="ForgotPassword"
        options={{ presentation: 'modal', title: 'Forgot password' }}
      />
      <Stack.Screen
        component={ResetPasswordScreen}
        name="ResetPassword"
        options={{ presentation: 'modal', title: 'Reset password' }}
      />
      <Stack.Screen
        component={VerifyEmailScreen}
        name="VerifyEmail"
        options={{ presentation: 'modal', title: 'Verify email' }}
      />
      <Stack.Screen
        component={VerifyPendingScreen}
        name="VerifyPending"
        options={{ presentation: 'modal', title: 'Verify pending' }}
      />
      <Stack.Screen
        component={EventDetailsScreen}
        name="EventDetails"
        options={({ route }) => ({
          headerTitleStyle: {
            color: theme.colors.textPrimary,
            fontFamily: fontFamily.bodyBold,
            fontSize: 15,
          },
          presentation: 'card',
          title: route.params.occurrence.eventSeries?.title ?? 'Event',
        })}
      />
      <Stack.Screen
        component={MessageThreadScreen}
        name="MessageThread"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.displayName,
        })}
      />
      <Stack.Screen
        component={EditProfileScreen}
        name="Profile"
        options={{ presentation: 'card', title: 'Edit profile' }}
      />
      <Stack.Screen component={SettingsScreen} name="Settings" options={{ presentation: 'card', title: 'Settings' }} />
      {detailRouteNames
        .filter(
          (routeName) =>
            !isAuthRoute(routeName) && !['EventDetails', 'MessageThread', 'Profile', 'Settings'].includes(routeName),
        )
        .map((routeName) => (
          <Stack.Screen
            key={routeName}
            name={routeName}
            options={{
              presentation: 'card',
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
