'use client';

import { useActionState, useState } from 'react';
import { resetPasswordAction } from '@/data/actions/server';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography,
} from '@mui/material';
import { CheckCircle, Visibility, VisibilityOff } from '@mui/icons-material';
import { FormErrors } from '@/components/FormErrors';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface Props {
  token: string;
}

export default function ResetPasswordForm({ token }: Props) {
  const boundAction = resetPasswordAction.bind(null, token);
  const [formState, formAction, isPending] = useActionState(boundAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (formState.data) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} marginBottom={1}>
          Password updated
        </Typography>
        <Typography variant="body1" color="text.secondary" marginBottom={4}>
          Your password has been reset successfully. You can now log in with your new password.
        </Typography>
        <Button component={Link} href={ROUTES.AUTH.LOGIN} variant="contained" color="secondary" fullWidth>
          Go to Login
        </Button>
      </Box>
    );
  }

  if (!token) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h5" fontWeight={700} marginBottom={1} color="error">
          Invalid link
        </Typography>
        <Typography variant="body1" color="text.secondary" marginBottom={4}>
          This reset link is missing a token. Please request a new one.
        </Typography>
        <Button component={Link} href={ROUTES.AUTH.FORGOT_PASSWORD} variant="contained" color="secondary" fullWidth>
          Request new link
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" action={formAction} noValidate sx={{ mt: 1 }}>
      <FormControl required fullWidth margin="normal">
        <InputLabel htmlFor="reset-password-new" color="secondary">
          New Password
        </InputLabel>
        <OutlinedInput
          id="reset-password-new"
          label="New Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          color="secondary"
          endAdornment={
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                {showPassword ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
        />
        <FormErrors error={formState.zodErrors?.password} />
      </FormControl>

      <FormControl required fullWidth margin="normal">
        <InputLabel htmlFor="reset-password-confirm" color="secondary">
          Confirm New Password
        </InputLabel>
        <OutlinedInput
          id="reset-password-confirm"
          label="Confirm New Password"
          name="confirm-password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          color="secondary"
          endAdornment={
            <InputAdornment position="end">
              <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end">
                {showConfirm ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
        />
        <FormErrors error={formState.zodErrors?.['confirm-password']} />
      </FormControl>

      {formState.apiError && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {formState.apiError}
        </Typography>
      )}

      <Button variant="contained" color="secondary" fullWidth sx={{ mt: 3, mb: 2 }} type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Set new password'}
      </Button>
    </Box>
  );
}
