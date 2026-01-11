import React from 'react';
import { Metadata } from 'next';
import { Person, PersonOutlined, ManageAccounts, Password, Interests, Event, PermMedia } from '@mui/icons-material';
import { Box, Container } from '@mui/material';
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
        name: 'Profile',
        content: <EditProfilePage user={user} />,
        icon: <PersonOutlined
          sx={{ marginRight: 1 }}
          key="profile-icon"
          fontSize="small"
        />,
        description: 'Customize your public profile',
      },
      {
        name: 'Personal',
        content: <PersonalSettingsPage user={user} />,
        icon: <Person
          key="personal-icon"
          fontSize="small"
          sx={{ marginRight: 1 }}
        />,
        description: 'Personal details and privacy',
      },
      {
        name: 'Interests',
        content: <InterestsSettingsPage user={user} eventCategoryGroups={groups.readEventCategoryGroups} />,
        icon: <Interests
          key="interests-icon"
          fontSize="small"
          sx={{ marginRight: 1 }}
        />,
        description: 'Manage your event interests',
      },
      {
        name: 'Events',
        content: <EventSettingsPage user={user} />,
        icon: <Event
          key="events-icon"
          fontSize="small"
          sx={{ marginRight: 1 }}
        />,
        description: 'Event preferences and notifications',
      },
      {
        name: 'Account',
        content: <AccountSettingsPage user={user} />,
        icon: <ManageAccounts
          key="account-icon"
          fontSize="small"
          sx={{ marginRight: 1 }}
        />,
        description: 'Account security and settings',
      },
      {
        name: 'Password',
        content: <PasswordSettingsPage />,
        icon: <Password
          key="password-icon"
          fontSize="small"
          sx={{ marginRight: 1 }}
        />,
        description: 'Change your password',
      },
      {
        name: 'Social Media',
        content: <SocialMediaSettingsPage />,
        icon: <PermMedia
          key="social-icon"
          fontSize="small"
          sx={{ marginRight: 1 }}
        />,
        description: 'Connect your social accounts',
      },
    ],
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 0, md: 4 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2, md: 3 } }}>
        <CustomTabs tabsProps={tabsProps} />
      </Container>
    </Box>
  );
}
