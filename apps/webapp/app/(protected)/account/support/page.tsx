import { Metadata } from 'next';
import { auth } from '@/auth';
import SupportRequestPageClient from '@/components/account/SupportRequestPageClient';
import { ROUTES } from '@/lib/constants';
import { buildPageMetadata } from '@/lib/metadata';
import { redirect } from 'next/navigation';

export const metadata: Metadata = buildPageMetadata({
  title: 'Help & Feedback',
  description: 'Ask for help, report issues, or send product feedback to the Gatherle team.',
  noIndex: true,
});

export default async function AccountSupportPage() {
  const session = await auth();

  if (!session?.user?.token) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  return (
    <SupportRequestPageClient
      contactEmail={session.user.email}
      user={{
        family_name: session.user.family_name,
        given_name: session.user.given_name,
        profile_picture: session.user.profile_picture,
        userRole: session.user.userRole,
        username: session.user.username,
      }}
    />
  );
}
