import Logo from '@/components/logo';
import LoginForm from '@/components/forms/auth/login';
import { Box, Button, Container, Divider, Paper, Typography } from '@mui/material';
import { FaFacebookF } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { MdEmail } from 'react-icons/md';

export default function LoginPage() {
  return (
    <Box sx={{ py: 6, minHeight: '100vh', backgroundColor: 'background.paper' }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
          <Logo />

          <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
            Log in
          </Typography>

          <LoginForm />

          <Divider sx={{ marginY: 2 }}>or</Divider>

          <Button
            variant="outlined"
            size="large"
            color="secondary"
            fullWidth
            startIcon={<FaFacebookF />}
            sx={{ mt: 1, mb: 1 }}
          >
            Continue with Facebook
          </Button>

          <Button
            variant="outlined"
            size="large"
            color="secondary"
            fullWidth
            startIcon={<FcGoogle />}
            sx={{ mt: 1, mb: 1 }}
          >
            Continue with Google
          </Button>

          <Button
            variant="outlined"
            size="large"
            color="secondary"
            fullWidth
            startIcon={<MdEmail />}
            sx={{ mt: 1, mb: 1 }}
          >
            Sign up with Email
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
