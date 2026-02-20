import { Box, Container, Paper, Typography } from '@mui/material';
import Logo from '@/components/logo';
import ForgotPasswordForm from '@/components/forms/auth/ForgotPassword';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Reset Password',
  description: 'Request a password reset link to regain access to your Gatherle account.',
  noIndex: true,
});

export default function ForgotPasswordPage() {
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
            Reset your password
          </Typography>
          <Typography textAlign="center" variant="body2" color="text.secondary" marginBottom={4}>
            Enter your email address and we'll send you a link to reset your password
          </Typography>

          <ForgotPasswordForm />
        </Paper>
      </Container>
    </Box>
  );
}
