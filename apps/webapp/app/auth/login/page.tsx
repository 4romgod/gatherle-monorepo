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
  Typography,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import { useCustomAppContext } from '@/components/app-context';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useFormState } from 'react-dom';
import { loginUserAction } from '@/data/actions/auth-actions';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { ZodErrors } from '@/components/zod-errors';

const LoginPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { setIsAuthN, setToastProps, toastProps } = useCustomAppContext();
  const [formState, formAction] = useFormState(loginUserAction, SERVER_ACTION_INITIAL_STATE);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  console.log('formState', formState);

  useEffect(() => {
    if (formState.apiError) {
      console.log(formState.apiError);
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

      // TODO Store token, Move to next page
    }
  }, [formState]);

  return (
    <Container maxWidth="xs">
      <Logo />

      <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
        Log in
      </Typography>

      <Box component="form" action={formAction} noValidate sx={{ mt: 1 }}>
        <FormControl required fullWidth margin="normal">
          <InputLabel htmlFor="email">Email Address</InputLabel>
          <OutlinedInput
            id="email"
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus={true}
          />
          <ZodErrors error={formState?.zodErrors?.email} />
        </FormControl>
        <FormControl required fullWidth margin="normal">
          <InputLabel htmlFor="password">Password</InputLabel>
          <OutlinedInput
            id="password"
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
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
          <ZodErrors error={formState?.zodErrors?.password} />
        </FormControl>

        <FormControlLabel control={<Checkbox value="remember" color="secondary" />} label="Remember me" />

        <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 3, mb: 2 }} type="submit">
          Log in
        </Button>

        <Grid container>
          <Grid item xs>
            <a style={{ color: '#1e88e5', cursor: 'pointer' }} onClick={() => router.push('/auth/forgot-password')}>
              Forgot password?
            </a>
          </Grid>
          <Grid item>
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

      <Button variant="outlined" color="primary" fullWidth={true} startIcon={<FacebookIcon />} sx={{ mt: 1, mb: 1 }}>
        Continue with Facebook
      </Button>

      <Button variant="outlined" color="primary" fullWidth={true} startIcon={<GoogleIcon />} sx={{ mt: 1, mb: 1 }}>
        Continue with Google
      </Button>

      <Button variant="outlined" color="primary" fullWidth={true} startIcon={<EmailIcon />} sx={{ mt: 1, mb: 1 }}>
        Sign up with Email
      </Button>
    </Container>
  );
};

export default LoginPage;
