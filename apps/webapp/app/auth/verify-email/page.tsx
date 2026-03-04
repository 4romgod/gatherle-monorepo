import Logo from '@/components/logo';
import { Box, Container, Paper } from '@mui/material';
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

          <VerifyEmailClient token={token} />
        </Paper>
      </Container>
    </Box>
  );
}
