import type { Metadata } from 'next';
import UserProfilePageClient from '@/components/users/UserProfilePageClient';

interface Props {
  params: Promise<{ username: string }>;
}

export const metadata: Metadata = {
  title: 'Community · Ntlango',
  description: 'Discover and connect with people in your community who share your interests.',
};

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  return <UserProfilePageClient username={username} />;
}
