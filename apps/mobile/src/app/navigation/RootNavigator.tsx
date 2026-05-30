import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBar } from '@/app/navigation/BottomTabBar';
import { HeaderMenuButton } from '@/app/navigation/HeaderMenuButton';
import { StackHeader } from '@/app/navigation/StackHeader';
import { useAppShell } from '@/app/providers/AppShellProvider';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { LoginProvidersScreen } from '@/screens/auth/LoginProvidersScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';
import { VerifyEmailScreen } from '@/screens/auth/VerifyEmailScreen';
import { VerifyPendingScreen } from '@/screens/auth/VerifyPendingScreen';
import { AdminScreen } from '@/screens/admin/AdminScreen';
import { EditProfileScreen } from '@/screens/account/EditProfileScreen';
import { AccountScreen } from '@/screens/account/AccountScreen';
import { CreateEventScreen } from '@/screens/account/CreateEventScreen';
import { EditEventScreen } from '@/screens/account/EditEventScreen';
import { MyEventsScreen } from '@/screens/account/MyEventsScreen';
import { MyOrganizationsScreen } from '@/screens/account/MyOrganizationsScreen';
import { CreateOrganizationScreen } from '@/screens/account/CreateOrganizationScreen';
import { EditOrganizationScreen } from '@/screens/account/EditOrganizationScreen';
import { SettingsScreen } from '@/screens/account/SettingsScreen';
import { CreateVenueScreen } from '@/screens/venues/CreateVenueScreen';
import { EditVenueScreen } from '@/screens/venues/EditVenueScreen';
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
import { OrganizationMembersScreen } from '@/screens/organizations/OrganizationMembersScreen';
import { UserProfileScreen } from '@/screens/users/UserProfileScreen';
import { UserHostedEventsScreen } from '@/screens/users/UserHostedEventsScreen';
import { UserConnectionsScreen } from '@/screens/users/UserConnectionsScreen';
import { VenuesScreen } from '@/screens/venues/VenuesScreen';
import { VenueDetailsScreen } from '@/screens/venues/VenueDetailsScreen';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontFamily } from '@/app/theme/typography';
import { MainTabParamList, RootStackParamList } from './routes';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const TABLET_BREAKPOINT = 768;

function MainTabs() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const { setMainTabsViewportHeight } = useAppShell();
  const isTabletLayout = width >= TABLET_BREAKPOINT;

  return (
    <SafeAreaView edges={['top']} style={[styles.mainTabsShell, { backgroundColor: theme.colors.surface }]}>
      <View
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (nextHeight > 0) {
            setMainTabsViewportHeight(nextHeight);
          }
        }}
        style={[styles.mainTabsBody, { backgroundColor: theme.colors.background }]}
      >
        <Tab.Navigator
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

export function RootNavigator() {
  const { theme } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={() => ({
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        header: Platform.OS === 'ios' ? (props) => <StackHeader {...props} /> : undefined,
        headerRight:
          Platform.OS === 'ios'
            ? undefined
            : () => (
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
      })}
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
        component={OrganizationMembersScreen}
        name="OrganizationMembers"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.orgName ? `${route.params.orgName} team` : 'Organization members',
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
        component={UserHostedEventsScreen}
        name="UserHostedEvents"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.displayName ?? route.params.username ?? 'Hosted events',
        })}
      />
      <Stack.Screen
        component={UserConnectionsScreen}
        name="UserConnections"
        options={({ route }) => ({
          presentation: 'card',
          title:
            route.params.mode === 'followers'
              ? `${route.params.displayName ?? route.params.username ?? 'Member'} followers`
              : `${route.params.displayName ?? route.params.username ?? 'Member'} following`,
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
        component={EditEventScreen}
        name="EditEvent"
        options={{ presentation: 'card', title: 'Edit event' }}
      />
      <Stack.Screen
        component={MyOrganizationsScreen}
        name="MyOrganizations"
        options={{ presentation: 'card', title: 'My organizations' }}
      />
      <Stack.Screen
        component={CreateOrganizationScreen}
        name="CreateOrganization"
        options={{ presentation: 'card', title: 'Create organization' }}
      />
      <Stack.Screen
        component={EditOrganizationScreen}
        name="EditOrganization"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.orgName ? `Edit ${route.params.orgName}` : 'Edit organization',
        })}
      />
      <Stack.Screen
        component={CreateVenueScreen}
        name="CreateVenue"
        options={{ presentation: 'card', title: 'Create venue' }}
      />
      <Stack.Screen
        component={EditVenueScreen}
        name="EditVenue"
        options={({ route }) => ({
          presentation: 'card',
          title: route.params.venueName ? `Edit ${route.params.venueName}` : 'Edit venue',
        })}
      />
      <Stack.Screen component={AdminScreen} name="Admin" options={{ presentation: 'card', title: 'Admin' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRightWrap: {
    marginRight: 18,
  },
  mainTabsBody: {
    flex: 1,
  },
  mainTabsShell: {
    flex: 1,
  },
});
