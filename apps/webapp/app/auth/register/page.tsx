'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/components/logo';
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
  Typography,
} from '@mui/material';
import { Facebook, Google, Visibility, VisibilityOff } from '@mui/icons-material';
import { registerUserAction } from '@/data/actions/auth-actions';
import { useFormState } from 'react-dom';
import { ZodErrors } from '@/components/zod-errors';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useCustomAppContext } from '@/components/app-context';
import { useEffect, useState } from 'react';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';

const RegisterPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { setIsAuthN, setToastProps, toastProps } = useCustomAppContext();
  const [formState, formAction] = useFormState(registerUserAction, SERVER_ACTION_INITIAL_STATE);

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
        message: 'You have successfully registered!',
      });

      // TODO Store token, Move to next page
    }
  }, [formState]);

  return (
    <Container maxWidth="xs">
      <Logo />

      <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
        Sign Up
      </Typography>

      <Typography variant="body1" textAlign="center" paddingBottom={3}>
        <span>Already a member?&nbsp;</span>
        <a style={{ color: '#1e88e5', cursor: 'pointer' }} onClick={() => router.push('/auth/login')}>
          {'Log in here'}
        </a>
      </Typography>

      <Box component="form" action={formAction} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <TextField required label="First Name" name="given_name" variant="outlined" />
              <ZodErrors error={formState?.zodErrors?.given_name} />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <TextField required label="Last Name" name="family_name" variant="outlined" />
              <ZodErrors error={formState?.zodErrors?.family_name} />
            </FormControl>
          </Grid>
        </Grid>
        <FormControl fullWidth margin="normal">
          <TextField required label="Email Address" name="email" variant="outlined" />
          <ZodErrors error={formState?.zodErrors?.email} />
        </FormControl>
        <FormControl fullWidth margin="normal">
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
        <FormControl fullWidth margin="normal">
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
            <DatePicker label="Date of Birth" format="D/M/YYYY" name="birthdate" />
          </LocalizationProvider>
          <ZodErrors error={formState?.zodErrors?.birthdate} />
        </FormControl>

        <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 2 }} type="submit">
          Sign up
        </Button>
      </Box>

      <Divider sx={{ marginY: 2 }}>or</Divider>

      <Button variant="outlined" fullWidth={true} startIcon={<Facebook />} sx={{ mt: 1, mb: 1 }}>
        Continue with Facebook
      </Button>

      <Button variant="outlined" fullWidth={true} startIcon={<Google />} sx={{ mt: 1, mb: 1 }}>
        Continue with Google
      </Button>
    </Container>
  );
};

export default RegisterPage;
