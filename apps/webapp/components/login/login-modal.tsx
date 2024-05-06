'use client';

import { Box, Checkbox, Container, Divider, FormControlLabel, Grid, TextField, Typography } from '@mui/material';
import CustomModal from '@/components/modal/custom-modal';
import CustomModalContentWrapper from '@/components/modal/custom-modal-content-wrapper';
import CustomModalButton from '@/components/modal/custom-modal-button';
import FacebookIcon from '@mui/icons-material/Facebook';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import { Dispatch, ReactElement, SetStateAction, useState } from 'react';
import Logo from '@/components/logo';
import Link from 'next/link';

export type LoginModalProps = {
  triggerButton: ReactElement;
  setIsAuthN: Dispatch<SetStateAction<boolean>>;
};

const LoginModal = ({ triggerButton, setIsAuthN }: LoginModalProps) => {
  const [open, setOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    console.log({
      email: data.get('email'),
      password: data.get('password'),
    });
  };

  return (
    <CustomModal
      triggerButton={triggerButton}
      isOpen={open}
      handleClose={() => setOpen(false)}
      handleOpen={() => setOpen(true)}
      modalContent={
        <CustomModalContentWrapper>
          <Logo />
          <Typography textAlign="center" variant="h4" fontWeight="bold">
            Log in
          </Typography>
          <Link href="#" style={{ width: '100%', textAlign: 'center' }}>
            {"Don't have an account? Sign Up"}
          </Link>

          <Container maxWidth="xs">
            <Box
              sx={{
                marginTop: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  color="secondary"
                />
                <FormControlLabel control={<Checkbox value="remember" color="primary" />} label="Remember me" />
                <Grid container paddingTop={3}>
                  <Grid item xs>
                    <Link href="#">Forgot password?</Link>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Container>

          <CustomModalButton
            variant="contained"
            color="primary"
            size="large"
            sx={{ paddingX: 10 }}
            onClick={() => {
              setIsAuthN(true);
              setOpen(false);
            }}
          >
            Log in
          </CustomModalButton>

          <Divider>or</Divider>

          <CustomModalButton variant="outlined" color="primary" startIcon={<FacebookIcon />} size="large">
            Continue with Facebook
          </CustomModalButton>
          <CustomModalButton
            variant="outlined"
            color="primary"
            startIcon={<GoogleIcon />}
            size="large"
            sx={{ paddingX: 10 }}
          >
            Continue with Google
          </CustomModalButton>
          <CustomModalButton variant="outlined" color="primary" startIcon={<EmailIcon />} size="large">
            Sign up with Email
          </CustomModalButton>
        </CustomModalContentWrapper>
      }
    />
  );
};

export default LoginModal;
