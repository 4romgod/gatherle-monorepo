import AuthPageShell from '@/components/forms/auth/AuthPageShell';
import { buildPageMetadata } from '@/lib/metadata';
import VerifyEmailClient from '@/components/forms/auth/VerifyEmail';

export const metadata = buildPageMetadata({
  title: 'Email Verification',
  description: 'Verifying your email address.',
  noIndex: true,
});

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <AuthPageShell>
      <VerifyEmailClient token={token} />
    </AuthPageShell>
  );
}
