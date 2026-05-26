import UserHostedEventsPageClient from '@/components/users/UserHostedEventsPageClient';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserHostedEventsPage({ params }: Props) {
  const { username } = await params;
  return <UserHostedEventsPageClient username={username} />;
}
