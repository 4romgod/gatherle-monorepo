'use client';

import Link from 'next/link';
import Logo from '@/components/logo';
import { Box, Checkbox, Container, Divider, FormControlLabel, Grid, TextField, Typography } from '@mui/material';
import CustomModalButton from '@/components/modal/custom-modal-button';
import FacebookIcon from '@mui/icons-material/Facebook';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import { ReactElement, cloneElement, useState } from 'react';
import CustomModal from '@/components/modal/custom-modal';
import CustomModalContentWrapper from '@/components/modal/custom-modal-content-wrapper';
import CustomModalCloseButton from '@/components/modal/custom-modal-close-button';
import SignupWithEmailModal from '@/components/modal/auth/signup-modal-form-modal';
import { useCustomAppContext } from '@/components/app-context';

export type LoginModalProps = {
  triggerButton: ReactElement;
};

const LoginModal = ({ triggerButton }: LoginModalProps) => {
  const { setIsAuthN } = useCustomAppContext();
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    console.log({
      email: data.get('email'),
      password: data.get('password'),
    });
  };

  return (
    <>
      {cloneElement(triggerButton, { onClick: () => handleOpen() })}
      <CustomModal open={open} onClose={handleClose}>
        <CustomModalContentWrapper>
          <CustomModalCloseButton handleClose={handleClose} />

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
                  color="secondary"
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
                <FormControlLabel control={<Checkbox value="remember" color="secondary" />} label="Remember me" />
                <Grid container paddingTop={3}>
                  <Grid item xs>
                    <Link href="#">Forgot password?</Link>
                  </Grid>
                </Grid>
                <CustomModalButton
                  variant="contained"
                  color="secondary"
                  size="large"
                  sx={{ paddingX: 10 }}
                  onClick={() => {
                    setIsAuthN(true);
                    setOpen(false);
                  }}
                >
                  Log in
                </CustomModalButton>
              </Box>

              <Divider>or</Divider>

              <CustomModalButton variant="outlined" color="secondary" startIcon={<FacebookIcon />} size="large">
                Continue with Facebook
              </CustomModalButton>

              <CustomModalButton
                variant="outlined"
                color="secondary"
                startIcon={<GoogleIcon />}
                size="large"
                sx={{ paddingX: 10 }}
              >
                Continue with Google
              </CustomModalButton>

              <SignupWithEmailModal
                triggerButton={
                  <CustomModalButton variant="outlined" color="secondary" startIcon={<EmailIcon />} size="large">
                    Sign up with Email
                  </CustomModalButton>
                }
                onParentClose={handleClose}
              />
            </Box>
          </Container>
        </CustomModalContentWrapper>
      </CustomModal>
    </>
  );
};

export default LoginModal;
