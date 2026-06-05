import AuthPageShell from '@/components/forms/auth/AuthPageShell';
import ForgotPasswordForm from '@/components/forms/auth/ForgotPassword';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Reset Password',
  description: `Request a password reset link to regain access to your ${APP_NAME} account.`,
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      subtitle="Enter your email address and we'll send you a link to reset your password"
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
