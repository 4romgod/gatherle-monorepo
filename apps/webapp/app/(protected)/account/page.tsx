import React from 'react';
import { Metadata } from 'next';
import { Person, PersonOutlined, ManageAccounts, Password, Interests, Event, PermMedia } from '@mui/icons-material';
import { Box } from '@mui/material';
import CustomTabs, { CustomTabsProps } from '@/components/tabs/custom-tabs';
import EditProfilePage from '@/components/settings/EditProfilePage';
import PersonalSettingsPage from '@/components/settings/PersonalSettingsPage';
import InterestsSettingsPage from '@/components/settings/InterestsSettingsPage';
import EventSettingsPage from '@/components/settings/EventSettingsPage';
import AccountSettingsPage from '@/components/settings/AccountSettingsPage';
import SocialMediaSettingsPage from '@/components/settings/SocialMediaSettingsPage';
import PasswordSettingsPage from '@/components/settings/PasswordSettingsPage';
import { auth } from '@/auth';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoryGroupsDocument } from '@/data/graphql/types/graphql';
import { omit } from 'lodash';

export const metadata: Metadata = {
  title: {
    default: 'Settings | Ntlango',
    template: '%s | Ntlango',
  },
  description: 'Manage your Ntlango account settings',
  icons: {
    icon: '/logo-img.png',
    shortcut: '/logo-img.png',
    apple: '/logo-img.png',
  },
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session) return;

  const { data: groups } = await getClient().query({
    query: GetAllEventCategoryGroupsDocument,
  });

  const user = omit(session.user, ['token', '__typename']);

  const tabsProps: CustomTabsProps = {
    tabsTitle: 'Settings',
    tabs: [
      {
        name: 'Edit Profile',
        content: <EditProfilePage user={user} />,
        icon: <PersonOutlined fontSize="small" />,
        description: 'Customize how you appear to others',
      },
      {
        name: 'Personal Info',
        content: <PersonalSettingsPage user={user} />,
        icon: <Person fontSize="small" />,
        description: 'Manage your personal information',
      },
      {
        name: 'Interests',
        content: <InterestsSettingsPage user={user} eventCategoryGroups={groups.readEventCategoryGroups} />,
        icon: <Interests fontSize="small" />,
        description: 'Select and manage your interests',
      },
      {
        name: 'Events',
        content: <EventSettingsPage user={user} />,
        icon: <Event fontSize="small" />,
        description: 'Configure your event preferences',
      },
      {
        name: 'Account',
        content: <AccountSettingsPage user={user} />,
        icon: <ManageAccounts fontSize="small" />,
        description: 'Control your account settings',
      },
      {
        name: 'Password',
        content: <PasswordSettingsPage />,
        icon: <Password fontSize="small" />,
        description: 'Control your account settings',
      },
      {
        name: 'Social media',
        content: <SocialMediaSettingsPage />,
        icon: <PermMedia fontSize="small" />,
        description: 'Connect social media accounts',
      },
    ],
  };

  return (
    <Box>
      <CustomTabs tabsProps={tabsProps} />
    </Box>
  );
}
