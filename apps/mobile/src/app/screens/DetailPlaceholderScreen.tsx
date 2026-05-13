import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
import type { DetailRouteName, MainTabParamList } from '@/app/navigation/routes';
import { detailScreenContent } from '@/app/navigation/routes';
import { ActionTile, type ActionTone, ScreenLayout, SectionCard, TonePill } from '@/components/core/ScreenLayout';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type Shortcut = {
  description: string;
  label: string;
  onPress: () => void;
  tone?: ActionTone;
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
          description: 'Return to the main event browse surface.',
          label: 'Events tab',
          onPress: () => goToTab(navigation, 'Events'),
        },
        {
          description: 'Open the community discovery screen next.',
          label: 'Organizations',
          onPress: () => navigation.navigate('Organizations'),
          tone: 'secondary',
        },
        {
          description: 'Jump into the people-first discovery surface.',
          label: 'Community',
          onPress: () => navigation.navigate('Community'),
        },
      ];
    case 'Community':
      return [
        {
          description: 'Community browsing should connect cleanly into conversations.',
          label: 'Messages tab',
          onPress: () => goToTab(navigation, 'Messages'),
        },
        {
          description: 'Open the individual profile surface next.',
          label: 'Profile',
          onPress: () => navigation.navigate('Profile'),
          tone: 'secondary',
        },
      ];
    case 'Organizations':
      return [
        {
          description: 'Switch from communities to place-based browsing.',
          label: 'Venues',
          onPress: () => navigation.navigate('Venues'),
        },
        {
          description: 'Open the broader user/community directory.',
          label: 'Community',
          onPress: () => navigation.navigate('Community'),
          tone: 'secondary',
        },
        {
          description: 'Jump into the owner-side organization area.',
          label: 'My organizations',
          onPress: () => navigation.navigate('MyOrganizations'),
          tone: 'success',
        },
      ];
    case 'Venues':
      return [
        {
          description: 'Bounce back into the main event feed.',
          label: 'Events tab',
          onPress: () => goToTab(navigation, 'Events'),
        },
        {
          description: 'Open category-led discovery instead.',
          label: 'Categories',
          onPress: () => navigation.navigate('Categories'),
          tone: 'secondary',
        },
      ];
    case 'Profile':
      return [
        {
          description: 'Profile context often leads into chat.',
          label: 'Messages tab',
          onPress: () => goToTab(navigation, 'Messages'),
        },
        {
          description: 'Return to the main account hub.',
          label: 'Account tab',
          onPress: () => goToTab(navigation, 'Account'),
          tone: 'secondary',
        },
      ];
    case 'Settings':
      return [
        {
          description: 'Move from preferences into the alert inbox.',
          label: 'Notifications tab',
          onPress: () => goToTab(navigation, 'Notifications'),
          tone: 'warning',
        },
        {
          description: 'Return to the main account hub.',
          label: 'Account tab',
          onPress: () => goToTab(navigation, 'Account'),
        },
      ];
    case 'MyEvents':
      return [
        {
          description: 'Go back to event discovery.',
          label: 'Events tab',
          onPress: () => goToTab(navigation, 'Events'),
        },
        {
          description: 'Related place management can branch from here.',
          label: 'Venues',
          onPress: () => navigation.navigate('Venues'),
          tone: 'secondary',
        },
        {
          description: 'Jump into the dedicated host-event placeholder.',
          label: 'Create event',
          onPress: () => navigation.navigate('CreateEvent'),
          tone: 'success',
        },
      ];
    case 'CreateEvent':
      return [
        {
          description: 'Return to the creator event management screen.',
          label: 'My events',
          onPress: () => navigation.navigate('MyEvents'),
        },
        {
          description: 'A host flow may need venue context next.',
          label: 'Venues',
          onPress: () => navigation.navigate('Venues'),
          tone: 'secondary',
        },
      ];
    case 'MyOrganizations':
      return [
        {
          description: 'Open public organization discovery.',
          label: 'Organizations',
          onPress: () => navigation.navigate('Organizations'),
        },
        {
          description: 'Keep a direct line to admin utilities.',
          label: 'Admin',
          onPress: () => navigation.navigate('Admin'),
          tone: 'warning',
        },
      ];
    case 'Admin':
      return [
        {
          description: 'Return to the regular account area.',
          label: 'Account tab',
          onPress: () => goToTab(navigation, 'Account'),
        },
        {
          description: 'Check operational alerts from the inbox.',
          label: 'Notifications tab',
          onPress: () => goToTab(navigation, 'Notifications'),
          tone: 'warning',
        },
      ];
    case 'Login':
      return [
        {
          description: 'Switch to account creation.',
          label: 'Register',
          onPress: () => navigation.navigate('Register'),
          tone: 'secondary',
        },
        {
          description: 'Open account recovery.',
          label: 'Forgot password',
          onPress: () => navigation.navigate('ForgotPassword'),
        },
      ];
    case 'Register':
      return [
        {
          description: 'Switch back to sign in.',
          label: 'Login',
          onPress: () => navigation.navigate('Login'),
        },
        {
          description: 'Preview the post-sign-up holding state.',
          label: 'Verify pending',
          onPress: () => navigation.navigate('VerifyPending'),
          tone: 'warning',
        },
      ];
    case 'ForgotPassword':
      return [
        {
          description: 'See the next step in recovery.',
          label: 'Reset password',
          onPress: () => navigation.navigate('ResetPassword'),
        },
        {
          description: 'Return to sign in.',
          label: 'Login',
          onPress: () => navigation.navigate('Login'),
          tone: 'secondary',
        },
      ];
    case 'ResetPassword':
      return [
        {
          description: 'Jump back to the entry screen.',
          label: 'Login',
          onPress: () => navigation.navigate('Login'),
        },
        {
          description: 'Open another auth-adjacent placeholder.',
          label: 'Verify email',
          onPress: () => navigation.navigate('VerifyEmail'),
          tone: 'secondary',
        },
      ];
    case 'VerifyEmail':
      return [
        {
          description: 'Inspect the pending verification state.',
          label: 'Verify pending',
          onPress: () => navigation.navigate('VerifyPending'),
          tone: 'warning',
        },
        {
          description: 'Go back to the entry point.',
          label: 'Login',
          onPress: () => navigation.navigate('Login'),
        },
      ];
    case 'VerifyPending':
      return [
        {
          description: 'Open the verification action screen.',
          label: 'Verify email',
          onPress: () => navigation.navigate('VerifyEmail'),
        },
        {
          description: 'Return to the account hub.',
          label: 'Account tab',
          onPress: () => goToTab(navigation, 'Account'),
          tone: 'secondary',
        },
      ];
    default:
      return [];
  }
}

const styles = StyleSheet.create({
  bodyText: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodyTextStrong: {
    ...typography.bodyBold,
  },
  placeholderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
