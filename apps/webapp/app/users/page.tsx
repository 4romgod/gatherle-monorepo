import type { Metadata } from 'next';
import UsersPageClient from '@/components/users/UsersPageClient';

export const metadata: Metadata = {
  title: 'Community · Ntlango',
  description: 'Discover and connect with people in your community who share your interests.',
};

export const revalidate = 120;

export default async function Page() {
  return <UsersPageClient />;
}
