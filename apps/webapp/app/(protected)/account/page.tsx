import React from 'react';
import { Metadata } from 'next';
import { Box, Container } from '@mui/material';
import CustomTabs, { type CustomTabItem } from '@/components/core/tabs/CustomTabs';
import EditProfilePage from '@/components/settings/EditProfilePage';
import PersonalSettingsPage from '@/components/settings/PersonalSettingsPage';
import InterestsSettingsPage from '@/components/settings/InterestsSettingsPage';
import EventSettingsPage from '@/components/settings/EventSettingsPage';
import AccountSettingsPage from '@/components/settings/AccountSettingsPage';
import SessionStateSettings from '@/components/settings/SessionStateSettings';
import PasswordSettingsPage from '@/components/settings/PasswordSettingsPage';
import AppearanceSettingsPage from '@/components/settings/AppearanceSettingsPage';
import { auth } from '@/auth';
import { getClient } from '@/data/graphql';
import { GetEventCategoryGroupsDocument } from '@/data/graphql/types/graphql';
import { omit } from 'lodash';
import { buildPageMetadata } from '@/lib/metadata';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { featureFlags } from '@/lib/constants/feature-flags';

export const metadata: Metadata = buildPageMetadata({
  title: 'Account Settings',
  description: 'Manage your profile, privacy, interests, notifications, and account security settings.',
  noIndex: true,
});

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

type AccountSettingsTab = CustomTabItem & {
  key: string;
};

const TAB_ALIASES: Record<string, string> = {
  appearance: 'appearance',
  events: 'alerts',
  interests: 'interests',
  password: 'password',
  personal: 'personal',
  privacy: 'privacy',
  profile: 'profile',
  session: 'session',
  theme: 'appearance',
  account: 'account',
  activity: 'activity',
  alerts: 'alerts',
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await auth();
  if (!session?.user?.token) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const { tab } = await searchParams;
  const requestedTabKey = tab ? (TAB_ALIASES[tab] ?? 'account') : 'account';

  const { data: groups } = await getClient().query({
    query: GetEventCategoryGroupsDocument,
  });

  const user = omit(session.user, ['token', '__typename']);

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
      content: <InterestsSettingsPage user={user} eventCategoryGroups={groups.readEventCategoryGroups} />,
      description: 'Manage your event interests',
    },
    {
      key: 'password',
      name: 'Password',
      content: <PasswordSettingsPage />,
      description: 'Change your password',
    },
    {
      key: 'session',
      name: 'Session',
      content: <SessionStateSettings token={session.user.token} />,
      description: 'Reset saved filters and drafts',
    },
  );

  const defaultTabIndex = tabs.findIndex(({ key }) => key === 'account');
  const requestedTabIndex = tabs.findIndex(({ key }) => key === requestedTabKey);
  const initialTabIndex = requestedTabIndex >= 0 ? requestedTabIndex : defaultTabIndex;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 0, md: 2.5 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2, md: 3 } }}>
        <CustomTabs
          tabsProps={{
            defaultTab: initialTabIndex,
            forceDefaultTab: true,
            layout: 'mobile',
            tabsTitle: 'Settings',
            tabs,
            persistence: {
              key: 'account-settings-tabs',
              userId: user.userId,
              syncToBackend: false,
              token: session.user.token,
            },
          }}
        />
      </Container>
    </Box>
  );
}
