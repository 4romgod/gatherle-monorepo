import { Box, Container, Paper, Typography } from '@mui/material';
import Logo from '@/components/logo';
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
            Set new password
          </Typography>
          <Typography textAlign="center" variant="body2" color="text.secondary" marginBottom={4}>
            Choose a strong password for your account
          </Typography>

          <ResetPasswordForm token={token ?? ''} />
        </Paper>
      </Container>
    </Box>
  );
}
