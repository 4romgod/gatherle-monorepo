import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { ApiStatusCard } from '../components/ApiStatusCard';
import { ActionTile, ActionTone, ScreenLayout, SectionCard, TonePill } from '../components/ScreenLayout';
import {
  DetailRouteName,
  MainTabParamList,
  RootStackParamList,
  detailScreenContent,
  tabScreenContent,
} from '../navigation/routes';
import { useAppTheme } from '../theme/AppThemeProvider';

type MainTabNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

type DetailNavigation = NativeStackNavigationProp<RootStackParamList>;

type Shortcut = {
  label: string;
  description: string;
  tone?: ActionTone;
  onPress: () => void;
};

function ShortcutSection({ title, description, actions }: { title: string; description: string; actions: Shortcut[] }) {
  return (
    <SectionCard description={description} title={title}>
      {actions.map((action) => (
        <ActionTile
          description={action.description}
          key={action.label}
          label={action.label}
          onPress={action.onPress}
          tone={action.tone}
        />
      ))}
    </SectionCard>
  );
}

function PlaceholderCard({ screenTitle, categoryLabel }: { screenTitle: string; categoryLabel: string }) {
  const { theme } = useAppTheme();

  return (
    <SectionCard
      description="The route exists in native navigation now, so real feature work can slot in without revisiting the shell."
      title="Placeholder page"
    >
      <View style={styles.placeholderRow}>
        <TonePill label={categoryLabel} tone="neutral" />
        <TonePill label="Ready for build-out" tone="primary" />
      </View>
      <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
        You are on the <Text style={[styles.bodyTextStrong, { color: theme.colors.textPrimary }]}>{screenTitle}</Text>{' '}
        screen.
      </Text>
    </SectionCard>
  );
}

function AccountQuickActions() {
  const navigation = useNavigation<MainTabNavigation>();

  return (
    <ShortcutSection
      actions={[
        {
          label: 'Profile',
          description: 'Open the user-facing profile shell.',
          onPress: () => navigation.navigate('Profile'),
        },
        {
          label: 'My events',
          description: 'Reach the hosted events management area.',
          onPress: () => navigation.navigate('MyEvents'),
        },
        {
          label: 'Create event',
          description: 'Preview the dedicated host-event route.',
          onPress: () => navigation.navigate('CreateEvent'),
          tone: 'success',
        },
        {
          label: 'My organizations',
          description: 'Jump into organization ownership and memberships.',
          onPress: () => navigation.navigate('MyOrganizations'),
        },
        {
          label: 'Settings',
          description: 'Inspect the initial preferences and theme control route.',
          onPress: () => navigation.navigate('Settings'),
          tone: 'secondary',
        },
        {
          label: 'Admin',
          description: 'Keep a compact admin surface reachable on mobile.',
          onPress: () => navigation.navigate('Admin'),
          tone: 'warning',
        },
      ]}
      description="These are the secondary account routes that make sense to carry into a mobile shell immediately."
      title="Your area"
    />
  );
}

export function HomeScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const content = tabScreenContent.Home;

  return (
    <ScreenLayout
      badge="First native pass"
      description={content.description}
      metrics={[
        { label: 'Primary tabs', value: '5' },
        { label: 'Auth screens', value: '6' },
        { label: 'Theme support', value: 'Light + Dark' },
      ]}
      sectionLabel={content.sectionLabel}
      title={content.title}
    >
      <ApiStatusCard />
      <ShortcutSection
        actions={[
          {
            label: 'Events',
            description: 'Open the event discovery tab.',
            onPress: () => navigation.navigate('Events'),
          },
          {
            label: 'Categories',
            description: 'See where category browsing will live.',
            onPress: () => navigation.navigate('Categories'),
            tone: 'secondary',
          },
          {
            label: 'Organizations',
            description: 'Open the community discovery route.',
            onPress: () => navigation.navigate('Organizations'),
          },
          {
            label: 'Venues',
            description: 'Reach the place-based browse screen.',
            onPress: () => navigation.navigate('Venues'),
            tone: 'secondary',
          },
          {
            label: 'Community',
            description: 'Open the community discovery route.',
            onPress: () => navigation.navigate('Community'),
          },
        ]}
        description="The browse surfaces mirror the main discovery areas from the webapp, condensed for native navigation."
        title="Discover surfaces"
      />
      <ShortcutSection
        actions={[
          {
            label: 'Messages',
            description: 'Go straight into the chat tab.',
            onPress: () => navigation.navigate('Messages'),
          },
          {
            label: 'Notifications',
            description: 'Open the in-app notification inbox.',
            onPress: () => navigation.navigate('Notifications'),
            tone: 'warning',
          },
          {
            label: 'Community',
            description: 'Preview the broader social discovery screen.',
            onPress: () => navigation.navigate('Community'),
            tone: 'success',
          },
        ]}
        description="Social touchpoints stay close to home so the shell already reflects Gatherle’s community side."
        title="Social surfaces"
      />
      <ShortcutSection
        actions={[
          {
            label: 'Account',
            description: 'Jump to the account tab.',
            onPress: () => navigation.navigate('Account'),
          },
          {
            label: 'Login',
            description: 'Inspect the mobile auth entry screen.',
            onPress: () => navigation.navigate('Login'),
            tone: 'secondary',
          },
          {
            label: 'Register',
            description: 'Open the sign-up screen placeholder.',
            onPress: () => navigation.navigate('Register'),
            tone: 'secondary',
          },
        ]}
        description="Account and auth remain one tap away while the product is still unauthenticated stub content."
        title="Account entry"
      />
    </ScreenLayout>
  );
}

export function EventsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const content = tabScreenContent.Events;

  return (
    <ScreenLayout
      badge="Bottom tab"
      description={content.description}
      metrics={[
        { label: 'Status', value: 'Stubbed' },
        { label: 'Focus', value: 'Discovery' },
      ]}
      sectionLabel={content.sectionLabel}
      title={content.title}
    >
      <PlaceholderCard categoryLabel="Discover" screenTitle={content.title} />
      <ShortcutSection
        actions={[
          {
            label: 'Categories',
            description: 'Category filters and interest picks branch from here.',
            onPress: () => navigation.navigate('Categories'),
            tone: 'secondary',
          },
          {
            label: 'Organizations',
            description: 'Community-led event browsing stays nearby.',
            onPress: () => navigation.navigate('Organizations'),
          },
          {
            label: 'Venues',
            description: 'Location-driven discovery gets a dedicated route.',
            onPress: () => navigation.navigate('Venues'),
          },
          {
            label: 'Create event',
            description: 'Keep the host-event entry point reachable from discovery.',
            onPress: () => navigation.navigate('CreateEvent'),
            tone: 'success',
          },
        ]}
        description="These routes support the event browse and management flows that will eventually replace the placeholder."
        title="Event-adjacent pages"
      />
    </ScreenLayout>
  );
}

export function MessagesScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const content = tabScreenContent.Messages;

  return (
    <ScreenLayout
      badge="Bottom tab"
      description={content.description}
      metrics={[
        { label: 'Status', value: 'Stubbed' },
        { label: 'Focus', value: 'Messaging' },
      ]}
      sectionLabel={content.sectionLabel}
      title={content.title}
    >
      <PlaceholderCard categoryLabel="Social" screenTitle={content.title} />
      <ShortcutSection
        actions={[
          {
            label: 'Profile',
            description: 'A conversation entry point often leads back to profile context.',
            onPress: () => navigation.navigate('Profile'),
            tone: 'success',
          },
          {
            label: 'Community',
            description: 'Move from chat into the broader people discovery surface.',
            onPress: () => navigation.navigate('Community'),
          },
          {
            label: 'Login',
            description: 'Chat is auth-dependent, so keep login close.',
            onPress: () => navigation.navigate('Login'),
            tone: 'secondary',
          },
        ]}
        description="The first messaging layout is stubbed, but the navigation already anticipates the flows around it."
        title="Related social routes"
      />
    </ScreenLayout>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const content = tabScreenContent.Notifications;

  return (
    <ScreenLayout
      badge="Bottom tab"
      description={content.description}
      metrics={[
        { label: 'Status', value: 'Stubbed' },
        { label: 'Focus', value: 'Alerts' },
      ]}
      sectionLabel={content.sectionLabel}
      title={content.title}
    >
      <PlaceholderCard categoryLabel="Updates" screenTitle={content.title} />
      <ShortcutSection
        actions={[
          {
            label: 'Messages',
            description: 'Move from notifications into the conversation area.',
            onPress: () => navigation.navigate('Messages'),
          },
          {
            label: 'Settings',
            description: 'Notification preferences will sit under settings.',
            onPress: () => navigation.navigate('Settings'),
            tone: 'secondary',
          },
          {
            label: 'Verify pending',
            description: 'Email and security reminders can route here too.',
            onPress: () => navigation.navigate('VerifyPending'),
            tone: 'warning',
          },
        ]}
        description="Notification handling usually branches into chat, settings, and account verification work."
        title="Connected routes"
      />
    </ScreenLayout>
  );
}

export function AccountScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const content = tabScreenContent.Account;

  return (
    <ScreenLayout
      badge="Bottom tab"
      description={content.description}
      metrics={[
        { label: 'Account routes', value: '5+' },
        { label: 'Auth routes', value: '6' },
      ]}
      sectionLabel={content.sectionLabel}
      title={content.title}
    >
      <PlaceholderCard categoryLabel="Account" screenTitle={content.title} />
      <AccountQuickActions />
      <ShortcutSection
        actions={[
          {
            label: 'Login',
            description: 'Core sign-in screen placeholder.',
            onPress: () => navigation.navigate('Login'),
            tone: 'secondary',
          },
          {
            label: 'Register',
            description: 'Account creation placeholder.',
            onPress: () => navigation.navigate('Register'),
            tone: 'secondary',
          },
          {
            label: 'Forgot password',
            description: 'Recovery request flow placeholder.',
            onPress: () => navigation.navigate('ForgotPassword'),
          },
          {
            label: 'Reset password',
            description: 'New password confirmation placeholder.',
            onPress: () => navigation.navigate('ResetPassword'),
          },
          {
            label: 'Verify email',
            description: 'Verification success and retry flow placeholder.',
            onPress: () => navigation.navigate('VerifyEmail'),
          },
          {
            label: 'Verify pending',
            description: 'Pending verification holding state placeholder.',
            onPress: () => navigation.navigate('VerifyPending'),
          },
        ]}
        description="All auth-related routes are already in navigation so the real forms can replace the stub cards directly."
        title="Auth routes"
      />
    </ScreenLayout>
  );
}

export function DetailPlaceholderScreen({ screenKey }: { screenKey: DetailRouteName }) {
  const navigation = useNavigation<DetailNavigation>();
  const { theme } = useAppTheme();
  const content = detailScreenContent[screenKey];

  const relatedActions = getRelatedActions(screenKey, navigation);

  return (
    <ScreenLayout
      badge={content.category}
      description={content.description}
      metrics={[
        { label: 'State', value: 'Placeholder' },
        { label: 'Area', value: content.category },
      ]}
      sectionLabel={content.sectionLabel}
      title={content.title}
    >
      <PlaceholderCard categoryLabel={content.category} screenTitle={content.title} />
      <SectionCard
        description="This copy only confirms the route exists while the UI shell is being established."
        title="Current state"
      >
        <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
          The {content.title} screen is part of the native navigation tree now, with light and dark mode already
          applied.
        </Text>
      </SectionCard>
      {relatedActions.length ? (
        <ShortcutSection
          actions={relatedActions}
          description="Useful jumps from this placeholder route."
          title="Keep moving"
        />
      ) : null}
    </ScreenLayout>
  );
}

function goToTab(navigation: DetailNavigation, screen: keyof MainTabParamList) {
  navigation.navigate('MainTabs', { screen });
}

function getRelatedActions(screenKey: DetailRouteName, navigation: DetailNavigation): Shortcut[] {
  switch (screenKey) {
    case 'Categories':
      return [
        {
          label: 'Events tab',
          description: 'Return to the main event browse surface.',
          onPress: () => goToTab(navigation, 'Events'),
        },
        {
          label: 'Organizations',
          description: 'Open the community discovery screen next.',
          onPress: () => navigation.navigate('Organizations'),
          tone: 'secondary',
        },
        {
          label: 'Community',
          description: 'Jump into the people-first discovery surface.',
          onPress: () => navigation.navigate('Community'),
        },
      ];
    case 'Community':
      return [
        {
          label: 'Messages tab',
          description: 'Community browsing should connect cleanly into conversations.',
          onPress: () => goToTab(navigation, 'Messages'),
        },
        {
          label: 'Profile',
          description: 'Open the individual profile surface next.',
          onPress: () => navigation.navigate('Profile'),
          tone: 'secondary',
        },
      ];
    case 'Organizations':
      return [
        {
          label: 'Venues',
          description: 'Switch from communities to place-based browsing.',
          onPress: () => navigation.navigate('Venues'),
        },
        {
          label: 'Community',
          description: 'Open the broader user/community directory.',
          onPress: () => navigation.navigate('Community'),
          tone: 'secondary',
        },
        {
          label: 'My organizations',
          description: 'Jump into the owner-side organization area.',
          onPress: () => navigation.navigate('MyOrganizations'),
          tone: 'success',
        },
      ];
    case 'Venues':
      return [
        {
          label: 'Events tab',
          description: 'Bounce back into the main event feed.',
          onPress: () => goToTab(navigation, 'Events'),
        },
        {
          label: 'Categories',
          description: 'Open category-led discovery instead.',
          onPress: () => navigation.navigate('Categories'),
          tone: 'secondary',
        },
      ];
    case 'Profile':
      return [
        {
          label: 'Messages tab',
          description: 'Profile context often leads into chat.',
          onPress: () => goToTab(navigation, 'Messages'),
        },
        {
          label: 'Account tab',
          description: 'Return to the main account hub.',
          onPress: () => goToTab(navigation, 'Account'),
          tone: 'secondary',
        },
      ];
    case 'Settings':
      return [
        {
          label: 'Notifications tab',
          description: 'Move from preferences into the alert inbox.',
          onPress: () => goToTab(navigation, 'Notifications'),
          tone: 'warning',
        },
        {
          label: 'Account tab',
          description: 'Return to the main account hub.',
          onPress: () => goToTab(navigation, 'Account'),
        },
      ];
    case 'MyEvents':
      return [
        {
          label: 'Events tab',
          description: 'Go back to event discovery.',
          onPress: () => goToTab(navigation, 'Events'),
        },
        {
          label: 'Venues',
          description: 'Related place management can branch from here.',
          onPress: () => navigation.navigate('Venues'),
          tone: 'secondary',
        },
        {
          label: 'Create event',
          description: 'Jump into the dedicated host-event placeholder.',
          onPress: () => navigation.navigate('CreateEvent'),
          tone: 'success',
        },
      ];
    case 'CreateEvent':
      return [
        {
          label: 'My events',
          description: 'Return to the creator event management screen.',
          onPress: () => navigation.navigate('MyEvents'),
        },
        {
          label: 'Venues',
          description: 'A host flow may need venue context next.',
          onPress: () => navigation.navigate('Venues'),
          tone: 'secondary',
        },
      ];
    case 'MyOrganizations':
      return [
        {
          label: 'Organizations',
          description: 'Open public organization discovery.',
          onPress: () => navigation.navigate('Organizations'),
        },
        {
          label: 'Admin',
          description: 'Keep a direct line to admin utilities.',
          onPress: () => navigation.navigate('Admin'),
          tone: 'warning',
        },
      ];
    case 'Admin':
      return [
        {
          label: 'Account tab',
          description: 'Return to the regular account area.',
          onPress: () => goToTab(navigation, 'Account'),
        },
        {
          label: 'Notifications tab',
          description: 'Check operational alerts from the inbox.',
          onPress: () => goToTab(navigation, 'Notifications'),
          tone: 'warning',
        },
      ];
    case 'Login':
      return [
        {
          label: 'Register',
          description: 'Switch to account creation.',
          onPress: () => navigation.navigate('Register'),
          tone: 'secondary',
        },
        {
          label: 'Forgot password',
          description: 'Open account recovery.',
          onPress: () => navigation.navigate('ForgotPassword'),
        },
      ];
    case 'Register':
      return [
        {
          label: 'Login',
          description: 'Switch back to sign in.',
          onPress: () => navigation.navigate('Login'),
        },
        {
          label: 'Verify pending',
          description: 'Preview the post-sign-up holding state.',
          onPress: () => navigation.navigate('VerifyPending'),
          tone: 'warning',
        },
      ];
    case 'ForgotPassword':
      return [
        {
          label: 'Reset password',
          description: 'See the next step in recovery.',
          onPress: () => navigation.navigate('ResetPassword'),
        },
        {
          label: 'Login',
          description: 'Return to sign in.',
          onPress: () => navigation.navigate('Login'),
          tone: 'secondary',
        },
      ];
    case 'ResetPassword':
      return [
        {
          label: 'Login',
          description: 'Jump back to the entry screen.',
          onPress: () => navigation.navigate('Login'),
        },
        {
          label: 'Verify email',
          description: 'Open another auth-adjacent placeholder.',
          onPress: () => navigation.navigate('VerifyEmail'),
          tone: 'secondary',
        },
      ];
    case 'VerifyEmail':
      return [
        {
          label: 'Verify pending',
          description: 'Inspect the pending verification state.',
          onPress: () => navigation.navigate('VerifyPending'),
          tone: 'warning',
        },
        {
          label: 'Login',
          description: 'Go back to the entry point.',
          onPress: () => navigation.navigate('Login'),
        },
      ];
    case 'VerifyPending':
      return [
        {
          label: 'Verify email',
          description: 'Open the verification action screen.',
          onPress: () => navigation.navigate('VerifyEmail'),
        },
        {
          label: 'Account tab',
          description: 'Return to the account hub.',
          onPress: () => goToTab(navigation, 'Account'),
          tone: 'secondary',
        },
      ];
    default:
      return [];
  }
}

const styles = StyleSheet.create({
  placeholderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bodyTextStrong: {
    fontWeight: '700',
  },
});
