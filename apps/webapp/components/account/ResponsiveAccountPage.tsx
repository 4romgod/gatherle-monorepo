'use client';

import type { EventCategoryGroup, User } from '@/data/graphql/types/graphql';
import AccountProfilePageClient from '@/components/account/AccountProfilePageClient';
import AccountSettingsHubClient from '@/components/account/AccountSettingsHubClient';

type ResponsiveAccountPageProps = {
  eventCategoryGroups: EventCategoryGroup[];
  hasExplicitTab: boolean;
  hasLocalPassword: boolean | null;
  requestedTabKey: string;
  token: string;
  user: User;
};

export default function ResponsiveAccountPage({
  eventCategoryGroups,
  hasExplicitTab,
  hasLocalPassword,
  requestedTabKey,
  token,
  user,
}: ResponsiveAccountPageProps) {
  const showAccountProfile = !hasExplicitTab && Boolean(user.username);

  if (showAccountProfile) {
    return <AccountProfilePageClient user={user} />;
  }

  return (
    <AccountSettingsHubClient
      eventCategoryGroups={eventCategoryGroups}
      hasLocalPassword={hasLocalPassword}
      initialTabKey={requestedTabKey}
      token={token}
      user={user}
    />
  );
}
