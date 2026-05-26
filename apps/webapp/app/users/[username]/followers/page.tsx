import UserConnectionsPageClient from '@/components/users/UserConnectionsPageClient';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserFollowersPage({ params }: Props) {
  const { username } = await params;
  return <UserConnectionsPageClient mode="followers" username={username} />;
}
