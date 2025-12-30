import Logo from '@/components/logo';
import { Box, Container, Paper, Typography } from '@mui/material';
import RegisterForm from '@/components/forms/auth/register';

export default function RegisterPage() {
  return (
    <Box sx={{ py: 6, minHeight: '100vh', backgroundColor: 'background.paper' }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
          <Logo />

          <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
            Sign Up
          </Typography>

          <RegisterForm />
        </Paper>
      </Container>
    </Box>
  );
}
