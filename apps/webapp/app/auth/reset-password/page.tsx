import AuthPageShell from '@/components/forms/auth/AuthPageShell';
import ResetPasswordForm from '@/components/forms/auth/ResetPassword';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Set New Password',
  description: `Set a new password for your ${APP_NAME} account.`,
  noIndex: true,
});

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  return (
    <AuthPageShell subtitle="Choose a strong password for your account" title="Set new password">
      <ResetPasswordForm token={token ?? ''} />
    </AuthPageShell>
  );
}
