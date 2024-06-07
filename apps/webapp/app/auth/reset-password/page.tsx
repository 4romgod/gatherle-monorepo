'use client';

import Logo from '@/components/logo';
import { FormErrors } from '@/components/form-errors';
import { resetPasswordAction } from '@/data/actions/auth';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useFormState } from 'react-dom';

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formState, formAction] = useFormState(resetPasswordAction, SERVER_ACTION_INITIAL_STATE);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleMouseDownConfirmPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <Container maxWidth="xs">
      <Logo />

      <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
        Reset Password
      </Typography>

      <Box component="form" action={formAction} noValidate sx={{ mt: 1 }}>
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
          <FormErrors error={formState?.zodErrors?.password} />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel htmlFor="password">Confirm Password</InputLabel>
          <OutlinedInput
            id="confirm-password"
            label="Confirm Password"
            name="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="current-password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowConfirmPassword}
                  onMouseDown={handleMouseDownConfirmPassword}
                  edge="end"
                >
                  {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            }
          />
          <FormErrors error={formState?.zodErrors?.['confirm-password']} />
        </FormControl>

        <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 3, mb: 2 }} type="submit">
          Reset Password
        </Button>
      </Box>
    </Container>
  );
};

export default ResetPasswordPage;
