'use client';

import { useActionState } from "react";
import Logo from '@/components/logo';
import { FormErrors } from '@/components/form-errors';
import { forgotPasswordAction } from '@/data/actions/server';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { Box, Button, Container, FormControl, InputLabel, OutlinedInput, Paper, Typography } from '@mui/material';

const ForgotPasswordPage = () => {
  const [formState, formAction] = useActionState(forgotPasswordAction, SERVER_ACTION_INITIAL_STATE);

  return (
    <Box sx={{ py: 6, minHeight: '100vh', backgroundColor: 'background.paper' }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
          <Logo />

          <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
            Forgot Password
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

            <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 3, mb: 2 }} type="submit">
              Reset Password
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;
