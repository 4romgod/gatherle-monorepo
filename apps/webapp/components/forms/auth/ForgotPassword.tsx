'use client';

import { useActionState } from 'react';
import { forgotPasswordAction } from '@/data/actions/server';
import { Box, Button, FormControl, InputLabel, OutlinedInput, Typography } from '@mui/material';
import { FormErrors } from '@/components/FormErrors';
import { CheckCircle } from '@mui/icons-material';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

export default function ForgotPasswordForm() {
  const [formState, formAction, isPending] = useActionState(forgotPasswordAction, {});

  if (formState.data) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} marginBottom={1}>
          Check your inbox
        </Typography>
        <Typography variant="body1" color="text.secondary" marginBottom={4}>
          If an account exists for that email address, we&apos;ve sent a password reset link. The link expires in 1
          hour.
        </Typography>
        <Button component={Link} href={ROUTES.AUTH.LOGIN} variant="contained" color="secondary" fullWidth>
          Back to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" action={formAction} noValidate sx={{ mt: 1 }}>
      <FormControl required fullWidth margin="normal">
        <InputLabel htmlFor="forgot-password-email" color="secondary">
          Email Address
        </InputLabel>
        <OutlinedInput
          id="forgot-password-email"
          label="Email Address"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus={true}
          color="secondary"
        />
        <FormErrors error={formState.zodErrors?.email} />
      </FormControl>

      {formState.apiError && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {formState.apiError}
        </Typography>
      )}

      <Button variant="contained" color="secondary" fullWidth sx={{ mt: 3, mb: 2 }} type="submit" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>
    </Box>
  );
}
