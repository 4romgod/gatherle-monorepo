'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useActionState } from 'react';
import { loginUserAction } from '@/data/actions/server/auth';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { FormErrors } from '@/components/form-errors';
import { useCustomAppContext } from '@/components/app-context';

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formState, formAction] = useActionState(loginUserAction, SERVER_ACTION_INITIAL_STATE);
  const { setToastProps, toastProps } = useCustomAppContext();

  const handleClickShowPassword = () => setShowPassword((prev) => !prev);
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

      // TODO: Redirect logic here
    }
  }, [formState, setToastProps, toastProps]);

  return (
    <Box component="form" action={formAction} noValidate sx={{ mt: 1 }}>
      <FormControl required fullWidth margin="normal">
        <InputLabel htmlFor="email" color="secondary">
          Email Address
        </InputLabel>
        <OutlinedInput
          id="email"
          label="Email Address"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          color="secondary"
        />
        <FormErrors error={formState?.zodErrors?.email} />
      </FormControl>

      <FormControl required fullWidth margin="normal">
        <InputLabel htmlFor="password" color="secondary">
          Password
        </InputLabel>
        <OutlinedInput
          id="password"
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          color="secondary"
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

      <Button variant="contained" color="secondary" fullWidth sx={{ mt: 3, mb: 2 }} type="submit">
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
  );
}
