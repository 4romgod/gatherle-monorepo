import type { Metadata } from 'next';
import AccountBlockedPageClient from '@/components/errors/AccountBlockedPageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Account Blocked',
  description: 'This Gatherle account no longer has access to the application.',
  noIndex: true,
});

export default function AccountBlockedPage() {
  return <AccountBlockedPageClient />;
}
