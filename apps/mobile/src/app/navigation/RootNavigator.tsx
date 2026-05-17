import { Feather } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '@/components/core/BrandMark';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { HeaderMenuButton } from '@/components/navigation/HeaderMenuButton';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { LoginProvidersScreen } from '@/features/auth/screens/LoginProvidersScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { VerifyEmailScreen } from '@/features/auth/screens/VerifyEmailScreen';
import { VerifyPendingScreen } from '@/features/auth/screens/VerifyPendingScreen';
import { AdminScreen } from '@/screens/admin/AdminScreen';
import { EditProfileScreen } from '@/screens/account/EditProfileScreen';
import { AccountScreen } from '@/screens/account/AccountScreen';
import { CreateEventScreen } from '@/screens/account/CreateEventScreen';
import { MyEventsScreen } from '@/screens/account/MyEventsScreen';
import { MyOrganizationsScreen } from '@/screens/account/MyOrganizationsScreen';
import { SettingsScreen } from '@/screens/account/SettingsScreen';
import { CategoriesScreen } from '@/screens/discovery/CategoriesScreen';
import { CommunityScreen } from '@/screens/discovery/CommunityScreen';
import { EventDetailsScreen } from '@/screens/events/EventDetailsScreen';
import { EventsScreen } from '@/screens/events/EventsScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { MessageThreadScreen } from '@/screens/messages/MessageThreadScreen';
import { MessagesScreen } from '@/screens/messages/MessagesScreen';
import { MomentsScreen } from '@/screens/moments/MomentsScreen';
import { NotificationsScreen } from '@/screens/notifications/NotificationsScreen';
import { OrganizationsScreen } from '@/screens/organizations/OrganizationsScreen';
import { OrganizationDetailsScreen } from '@/screens/organizations/OrganizationDetailsScreen';
import { UserProfileScreen } from '@/screens/users/UserProfileScreen';
import { VenuesScreen } from '@/screens/venues/VenuesScreen';
import { VenueDetailsScreen } from '@/screens/venues/VenueDetailsScreen';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { fontFamily, fontSize } from '@/shared/theme/typography';
import { DetailRouteName, MainTabParamList, RootStackParamList, authRouteNames } from './routes';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const TABLET_BREAKPOINT = 768;

function MainTabs() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= TABLET_BREAKPOINT;
  const [activeTab, setActiveTab] = useState<keyof MainTabParamList>('Home');

  return (
    <SafeAreaView edges={['top']} style={[styles.mainTabsShell, { backgroundColor: theme.colors.surface }]}>
      {activeTab !== 'Moments' ? (
        <View style={styles.mainTabsHeader}>
          <View style={styles.headerLeftWrap}>
            <BrandMark />
          </View>
          <View style={styles.headerRightWrap}>
            <HeaderMenuButton />
          </View>
        </View>
      ) : null}

      <View style={[styles.mainTabsBody, { backgroundColor: theme.colors.background }]}>
        <Tab.Navigator
          screenListeners={{
            state: (event) => {
              const tabState = event.data.state as { index?: number; routes?: { name: string }[] } | undefined;
              const nextRoute = tabState?.routes?.[tabState.index ?? 0]?.name;
              if (nextRoute) {
                setActiveTab(nextRoute as keyof MainTabParamList);
              }
            },
          }}
          tabBarPosition="bottom"
          screenOptions={{
            lazy: true,
            swipeEnabled: true,
          }}
          tabBar={(props: MaterialTopTabBarProps) => <BottomTabBar {...props} isTabletLayout={isTabletLayout} />}
        >
          <Tab.Screen component={HomeScreen} name="Home" options={{ title: 'Home' }} />
          <Tab.Screen component={EventsScreen} name="Events" options={{ title: 'Events' }} />
          <Tab.Screen component={MomentsScreen} name="Moments" options={{ title: 'Moments' }} />
          <Tab.Screen component={MessagesScreen} name="Messages" options={{ title: 'Messages' }} />
          <Tab.Screen component={NotificationsScreen} name="Notifications" options={{ title: 'Notifications' }} />
          <Tab.Screen component={AccountScreen} name="Account" options={{ title: 'Account' }} />
        </Tab.Navigator>
      </View>
    </SafeAreaView>
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
        component={CategoriesScreen}
        name="Categories"
        options={{ presentation: 'card', title: 'Categories' }}
      />
      <Stack.Screen
        component={CommunityScreen}
        name="Community"
        options={{ presentation: 'card', title: 'Community' }}
      />
      <Stack.Screen
        component={OrganizationsScreen}
        name="Organizations"
        options={{ presentation: 'card', title: 'Organizations' }}
      />
      <Stack.Screen component={VenuesScreen} name="Venues" options={{ presentation: 'card', title: 'Venues' }} />
      <Stack.Screen
        component={OrganizationDetailsScreen}
        name="OrganizationDetails"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.orgName ?? 'Organization',
        })}
      />
      <Stack.Screen
        component={VenueDetailsScreen}
        name="VenueDetails"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.venueName ?? 'Venue',
        })}
      />
      <Stack.Screen
        component={UserProfileScreen}
        name="UserProfile"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.displayName ?? route.params.username ?? 'Profile',
        })}
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
      <Stack.Screen component={MyEventsScreen} name="MyEvents" options={{ presentation: 'card', title: 'My events' }} />
      <Stack.Screen
        component={CreateEventScreen}
        name="CreateEvent"
        options={{ presentation: 'card', title: 'Create event' }}
      />
      <Stack.Screen
        component={MyOrganizationsScreen}
        name="MyOrganizations"
        options={{ presentation: 'card', title: 'My organizations' }}
      />
      <Stack.Screen component={AdminScreen} name="Admin" options={{ presentation: 'card', title: 'Admin' }} />
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
  mainTabsBody: {
    flex: 1,
  },
  mainTabsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 78,
    paddingBottom: 14,
    paddingTop: 8,
  },
  mainTabsShell: {
    flex: 1,
  },
});
