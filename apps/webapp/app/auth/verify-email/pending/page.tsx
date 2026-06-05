import AuthPageShell from '@/components/forms/auth/AuthPageShell';
import { buildPageMetadata } from '@/lib/metadata';
import VerifyEmailPendingClient from '@/components/forms/auth/VerifyEmailPending';

export const metadata = buildPageMetadata({
  title: 'Verify Your Email',
  description: 'Check your inbox and click the verification link we sent you.',
  noIndex: true,
});

export default function VerifyEmailPendingPage() {
  return (
    <AuthPageShell>
      <VerifyEmailPendingClient />
    </AuthPageShell>
  );
}
