import UserConnectionsPageClient from '@/components/users/UserConnectionsPageClient';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserFollowingPage({ params }: Props) {
  const { username } = await params;
  return <UserConnectionsPageClient mode="following" username={username} />;
}
