import Logo from '@/components/logo';
import { Box, Container, Paper, Typography } from '@mui/material';
import { buildPageMetadata } from '@/lib/metadata';
import VerifyEmailPendingClient from '@/components/forms/auth/VerifyEmailPending';

export const metadata = buildPageMetadata({
  title: 'Verify Your Email',
  description: 'Check your inbox and click the verification link we sent you.',
  noIndex: true,
});

export default function VerifyEmailPendingPage() {
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

          <VerifyEmailPendingClient />
        </Paper>
      </Container>
    </Box>
  );
}
