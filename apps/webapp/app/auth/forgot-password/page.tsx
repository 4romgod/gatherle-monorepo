'use client';

import Logo from '@/components/logo';
import { FormErrors } from '@/components/form-errors';
import { forgotPasswordAction } from '@/data/actions/auth';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { Box, Button, Container, FormControl, InputLabel, OutlinedInput, Typography } from '@mui/material';
import { useFormState } from 'react-dom';

const ForgotPasswordPage = () => {
  const [formState, formAction] = useFormState(forgotPasswordAction, SERVER_ACTION_INITIAL_STATE);

  return (
    <Container maxWidth="xs">
      <Logo />

      <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
        Forgot Password
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
          <FormErrors error={formState?.zodErrors?.email} />
        </FormControl>

        <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 3, mb: 2 }} type="submit">
          Reset Password
        </Button>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;
