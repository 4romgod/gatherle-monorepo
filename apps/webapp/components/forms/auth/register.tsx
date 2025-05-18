'use client';

import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
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
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { registerUserAction } from '@/data/actions/server/auth';
import { useActionState } from 'react';
import { FormErrors } from '@/components/form-errors';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useCustomAppContext } from '@/components/app-context';
import { useEffect, useState } from 'react';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebookF } from 'react-icons/fa';

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { setToastProps, toastProps } = useCustomAppContext();
  const [formState, formAction] = useActionState(registerUserAction, SERVER_ACTION_INITIAL_STATE);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

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

      // TODO: Redirect to the next page
    }
  }, [formState, setToastProps, toastProps]);

  return (
    <Box component="form" action={formAction} noValidate>
      <Typography variant="body1" textAlign="center" paddingBottom={3}>
        <span>Already a member?&nbsp;</span>
        <a style={{ color: '#1e88e5', cursor: 'pointer' }} onClick={() => router.push('/auth/login')}>
          {'Log in here'}
        </a>
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth margin="normal">
            <TextField
              required
              label="First Name"
              name="given_name"
              variant="outlined"
              color='secondary'
            />
            <FormErrors error={formState?.zodErrors?.given_name} />
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth margin="normal">
            <TextField
              required
              label="Last Name"
              name="family_name"
              variant="outlined"
              color='secondary'
            />
            <FormErrors error={formState?.zodErrors?.family_name} />
          </FormControl>
        </Grid>
      </Grid>
      <FormControl fullWidth margin="normal">
        <TextField
          required
          label="Email Address"
          name="email"
          variant="outlined"
          color='secondary'
        />
        <FormErrors error={formState?.zodErrors?.email} />
      </FormControl>
      <FormControl fullWidth margin="normal">
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
      <FormControl fullWidth margin="normal">
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale="en"
        >
          <DatePicker
            label="Date of Birth"
            format="YYYY-MM-DD"
            name="birthdate"
          />
        </LocalizationProvider>
        <FormErrors error={formState?.zodErrors?.birthdate} />
      </FormControl>

      <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 2 }} type="submit">
        Sign up
      </Button>

      <Divider sx={{ marginY: 2 }}>or</Divider>

      <Button
        variant="outlined"
        size="large"
        fullWidth={true}
        startIcon={<FaFacebookF />}
        color='secondary'
        sx={{ mt: 1, mb: 1 }}
      >
        Continue with Facebook
      </Button>

      <Button
        variant="outlined"
        size="large"
        fullWidth={true}
        startIcon={<FcGoogle />}
        color='secondary'
        sx={{ mt: 1, mb: 1 }}
      >
        Continue with Google
      </Button>
    </Box>
  );
};
