import AuthPageShell from '@/components/forms/auth/AuthPageShell';
import RegisterForm from '@/components/forms/auth/Register';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Create Account',
  description: `Create your ${APP_NAME} account to discover events, host experiences, and connect with your community.`,
  noIndex: true,
});

export default function RegisterPage() {
  return (
    <AuthPageShell subtitle={`Join ${APP_NAME} to discover and host amazing events`} title="Create your account">
      <RegisterForm />
    </AuthPageShell>
  );
}
