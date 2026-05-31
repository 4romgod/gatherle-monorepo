import { ROUTES } from '@/lib/constants';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { redirect } from 'next/navigation';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Events',
  description: 'View and manage events you are hosting or organizing.',
  noIndex: true,
});

export default async function AccountEventsPage() {
  redirect(ROUTES.ACCOUNT.EVENTS.ROOT);
}
