import Logo from '@/components/logo';
import LoginForm from '@/components/forms/auth/Login';
import SocialAuthButtons from '@/components/forms/auth/SocialAuthButtons';
import { Box, Container, Divider, Paper, Typography } from '@mui/material';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Sign In',
  description: `Sign in to ${APP_NAME} to manage events, follow communities, and personalize your event feed.`,
  noIndex: true,
});

export default function LoginPage() {
  return (
    <Box sx={{ py: 6, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            padding: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Logo />
          </Box>

          <Typography textAlign="center" component="h1" variant="h4" fontWeight={700} marginBottom={1}>
            Welcome back
          </Typography>
          <Typography textAlign="center" variant="body2" color="text.secondary" marginBottom={4}>
            Sign in to your account to continue
          </Typography>

          <LoginForm />

          <Divider sx={{ marginY: 3 }}>or</Divider>
          <SocialAuthButtons showEmailSignupButton />
        </Paper>
      </Container>
    </Box>
  );
}
