'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/logo';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Paper,
  Typography,
} from '@mui/material';
import { useCustomAppContext } from '@/components/app-context';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useActionState } from 'react';
import { loginUserAction } from '@/data/actions/server/auth';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { FormErrors } from '@/components/form-errors';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';

const LoginPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formState, formAction] = useActionState(loginUserAction, SERVER_ACTION_INITIAL_STATE);
  const { setToastProps, toastProps } = useCustomAppContext();

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  useEffect(() => {
    if (formState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: formState.apiError,
      });
    }

    if (formState.data) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'You have successfully logged in!',
      });

      // TODO: Redirect to the next page
    }
  }, [formState]);

  return (
    <Box sx={{ py: 6, minHeight: '100vh', backgroundColor: 'background.paper' }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
          <Logo />

          <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
            Log in
          </Typography>

          <Box component="form" action={formAction} noValidate sx={{ mt: 1 }}>
            <FormControl required fullWidth margin="normal">
              <InputLabel
                htmlFor="email"
                color='secondary'
              >
                Email Address
              </InputLabel>
              <OutlinedInput
                id="email"
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus={true}
                color='secondary'
              />
              <FormErrors error={formState?.zodErrors?.email} />
            </FormControl>
            <FormControl required fullWidth margin="normal">
              <InputLabel
                htmlFor="password"
                color='secondary'
              >
                Password
              </InputLabel>
              <OutlinedInput
                id="password"
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                color='secondary'
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <FormErrors error={formState?.zodErrors?.password} />
            </FormControl>

            <FormControlLabel control={<Checkbox value="remember" color="secondary" />} label="Remember me" />

            <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 3, mb: 2 }} type="submit">
              Log in
            </Button>

            <Grid container>
              <Grid>
                <a style={{ color: '#1e88e5', cursor: 'pointer' }} onClick={() => router.push('/auth/forgot-password')}>
                  Forgot password?
                </a>
              </Grid>
              <Grid>
                <Box>
                  <span>Don&apos;t have an account?&nbsp;</span>
                  <a style={{ color: '#1e88e5', cursor: 'pointer' }} onClick={() => router.push('/auth/register')}>
                    {'Sign Up'}
                  </a>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ marginY: 2 }}>or</Divider>

          <Button
            variant="outlined"
            size="large"
            color="secondary"
            fullWidth={true}
            startIcon={<FaFacebookF />}
            sx={{ mt: 1, mb: 1 }}
          >
            Continue with Facebook
          </Button>

          <Button
            variant="outlined"
            size="large"
            color="secondary"
            fullWidth={true}
            startIcon={<FcGoogle />}
            sx={{ mt: 1, mb: 1 }}
          >
            Continue with Google
          </Button>

          <Button
            variant="outlined"
            size="large"
            color="secondary"
            fullWidth={true}
            startIcon={<MdEmail />}
            sx={{ mt: 1, mb: 1 }}
          >
            Sign up with Email
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
