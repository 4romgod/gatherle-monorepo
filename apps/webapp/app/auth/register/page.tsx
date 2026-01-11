import Logo from '@/components/logo';
import { Box, Container, Paper, Typography } from '@mui/material';
import RegisterForm from '@/components/forms/auth/register';

export default function RegisterPage() {
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
            Create your account
          </Typography>
          <Typography textAlign="center" variant="body2" color="text.secondary" marginBottom={4}>
            Join Ntlango to discover and host amazing events
          </Typography>

          <RegisterForm />
        </Paper>
      </Container>
    </Box>
  );
}
