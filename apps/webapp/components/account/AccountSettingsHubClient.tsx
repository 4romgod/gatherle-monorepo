'use client';

import { Box, Container } from '@mui/material';
import type { EventCategoryGroup, User } from '@/data/graphql/types/graphql';
import CustomTabs, { type CustomTabItem } from '@/components/core/tabs/CustomTabs';
import AccountHubShell from '@/components/account/AccountHubShell';
import EditProfilePage from '@/components/settings/EditProfilePage';
import PersonalSettingsPage from '@/components/settings/PersonalSettingsPage';
import InterestsSettingsPage from '@/components/settings/InterestsSettingsPage';
import EventSettingsPage from '@/components/settings/EventSettingsPage';
import AccountSettingsPage from '@/components/settings/AccountSettingsPage';
import SessionStateSettings from '@/components/settings/SessionStateSettings';
import PasswordSettingsPage from '@/components/settings/PasswordSettingsPage';
import AppearanceSettingsPage from '@/components/settings/AppearanceSettingsPage';
import { featureFlags } from '@/lib/constants/feature-flags';

type AccountSettingsHubClientProps = {
  eventCategoryGroups: EventCategoryGroup[];
  hasExplicitTab: boolean;
  hasLocalPassword: boolean | null;
  initialTabKey: string;
  token: string;
  user: User;
};

type AccountSettingsTab = CustomTabItem & {
  key: string;
};

export default function AccountSettingsHubClient({
  eventCategoryGroups,
  hasExplicitTab,
  hasLocalPassword,
  initialTabKey,
  token,
  user,
}: AccountSettingsHubClientProps) {
  const tabs: AccountSettingsTab[] = [
    {
      key: 'profile',
      name: 'Profile',
      content: <EditProfilePage user={user} />,
      description: 'Customize your public profile',
    },
    {
      key: 'account',
      name: 'Account',
      content: <AccountSettingsPage user={user} />,
      description: 'Email and account management',
    },
    {
      key: 'personal',
      name: 'Personal',
      content: <PersonalSettingsPage section="personal" user={user} />,
      description: 'Personal details and discovery context',
    },
    {
      key: 'activity',
      name: 'Activity',
      content: <PersonalSettingsPage section="activity" user={user} />,
      description: 'Defaults for RSVPs and check-ins',
    },
    {
      key: 'alerts',
      name: 'Alerts',
      content: <EventSettingsPage user={user} />,
      description: 'Email and push delivery preferences',
    },
    {
      key: 'appearance',
      name: 'Theme',
      content: <AppearanceSettingsPage />,
      description: 'Color mode and visual preference',
    },
  ];

  if (featureFlags.enablePrivateUsers) {
    const activityIndex = tabs.findIndex(({ key }) => key === 'activity');
    const privacyTab: AccountSettingsTab = {
      key: 'privacy',
      name: 'Privacy',
      content: <PersonalSettingsPage section="privacy" user={user} />,
      description: 'Audience and relationship visibility',
    };

    if (activityIndex >= 0) {
      tabs.splice(activityIndex, 0, privacyTab);
    } else {
      tabs.push(privacyTab);
    }
  }

  tabs.push(
    {
      key: 'interests',
      name: 'Interests',
      content: <InterestsSettingsPage user={user} eventCategoryGroups={eventCategoryGroups} />,
      description: 'Manage your event interests',
    },
    {
      key: 'password',
      name: 'Password',
      content: <PasswordSettingsPage hasLocalPassword={hasLocalPassword} />,
      description: 'Change your password',
    },
    {
      key: 'session',
      name: 'Session',
      content: <SessionStateSettings token={token} />,
      description: 'Reset saved filters and drafts',
    },
  );

  const defaultTabIndex = tabs.findIndex(({ key }) => key === 'account');
  const requestedTabIndex = tabs.findIndex(({ key }) => key === initialTabKey);
  const initialTabIndex = requestedTabIndex >= 0 ? requestedTabIndex : defaultTabIndex;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 0, md: 2.5 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2, md: 3 } }}>
        <AccountHubShell user={user}>
          <CustomTabs
            tabsProps={{
              defaultTab: initialTabIndex,
              forceDefaultTab: hasExplicitTab,
              layout: 'mobile',
              tabsTitle: 'Settings',
              tabs,
              persistence: {
                key: 'account-settings-tabs',
                userId: user.userId,
                syncToBackend: false,
                token,
              },
            }}
          />
        </AccountHubShell>
      </Container>
    </Box>
  );
}
