'use client';

import { useActionState } from 'react';
import { forgotPasswordAction } from '@/data/actions/server';
import { Box, Button, FormControl, InputLabel, OutlinedInput } from '@mui/material';
import { FormErrors } from '@/components/form-errors';

export default function ForgotPasswordForm() {
  const [formState, formAction] = useActionState(forgotPasswordAction, {});

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
          autoFocus={true}
          color="secondary"
        />
        <FormErrors error={formState.zodErrors?.email} />
      </FormControl>

      <Button variant="contained" color="secondary" fullWidth sx={{ mt: 3, mb: 2 }} type="submit">
        Reset Password
      </Button>
    </Box>
  );
}
