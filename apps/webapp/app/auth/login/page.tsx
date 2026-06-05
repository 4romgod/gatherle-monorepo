import LoginForm from '@/components/forms/auth/Login';
import SocialAuthButtons from '@/components/forms/auth/SocialAuthButtons';
import AuthPageShell from '@/components/forms/auth/AuthPageShell';
import { Divider } from '@mui/material';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Sign In',
  description: `Sign in to ${APP_NAME} to manage events, follow communities, and personalize your event feed.`,
  noIndex: true,
});

export default function LoginPage() {
  return (
    <AuthPageShell subtitle="Sign in to your account to continue" title="Welcome back">
      <LoginForm />
      <Divider sx={{ marginY: 3 }}>or</Divider>
      <SocialAuthButtons showEmailSignupButton />
    </AuthPageShell>
  );
}
