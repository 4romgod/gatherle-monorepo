import { Metadata } from 'next';
import type { User } from '@/data/graphql/types/graphql';
import ResponsiveAccountPage from '@/components/account/ResponsiveAccountPage';
import { auth } from '@/auth';
import { getClient } from '@/data/graphql';
import { GetUserByIdDocument } from '@/data/graphql/query/User/query';
import { GetEventCategoryGroupsDocument } from '@/data/graphql/types/graphql';
import { omit } from 'lodash';
import { buildPageMetadata } from '@/lib/metadata';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';

export const metadata: Metadata = buildPageMetadata({
  title: 'Account',
  description: 'Manage your profile, preferences, organizations, and account security from one hub.',
  noIndex: true,
});

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string }>;
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
  const hasExplicitTab = Boolean(tab);
  const requestedTabKey = tab ? (TAB_ALIASES[tab] ?? 'account') : 'account';

  const [groupsResult, userPasswordStateResult] = await Promise.all([
    getClient().query({
      query: GetEventCategoryGroupsDocument,
    }),
    getClient()
      .query({
        query: GetUserByIdDocument,
        variables: { userId: session.user.userId },
        context: {
          headers: getAuthHeader(session.user.token),
        },
        fetchPolicy: 'no-cache',
      })
      .catch(() => null),
  ]);

  const user = omit(session.user, ['token', '__typename']) as User;
  const hasLocalPassword =
    userPasswordStateResult?.data?.readUserById?.hasLocalPassword ?? session.user.hasLocalPassword ?? null;

  return (
    <ResponsiveAccountPage
      eventCategoryGroups={groupsResult.data.readEventCategoryGroups}
      hasExplicitTab={hasExplicitTab}
      hasLocalPassword={hasLocalPassword}
      requestedTabKey={requestedTabKey}
      token={session.user.token}
      user={user}
    />
  );
}
