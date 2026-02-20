import type { Metadata } from 'next';
import UserProfilePageClient from '@/components/users/UserProfilePageClient';
import { getClient } from '@/data/graphql';
import { GetUserByUsernameDocument, GetUserByUsernameQuery } from '@/data/graphql/types/graphql';
import { buildPageMetadata } from '@/lib/metadata';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    const { data } = await getClient().query<GetUserByUsernameQuery>({
      query: GetUserByUsernameDocument,
      variables: { username },
    });
    const user = data.readUserByUsername;

    if (user) {
      const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
      const displayName = fullName || `@${user.username}`;
      return buildPageMetadata({
        title: `${displayName} Profile`,
        description: user.bio || `Explore ${displayName}'s profile, interests, and community activity on Gatherle.`,
        keywords: [user.username, fullName, 'community profile', 'event community'].filter(Boolean) as string[],
      });
    }
  } catch {
    // TODO: Fall through to fallback metadata
  }

  return buildPageMetadata({
    title: 'Community Profile',
    description: 'Discover people in the Gatherle community and connect through shared interests.',
    keywords: ['community profile', 'event community', 'connect with people'],
  });
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  return <UserProfilePageClient username={username} />;
}
