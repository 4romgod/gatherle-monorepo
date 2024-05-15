'use client';

import Link from 'next/link';
import Logo from '@/components/logo';
import { ReactElement, cloneElement, useState } from 'react';
import {
  Box,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import CustomModalButton from '@/components/modal/custom-modal-button';
import FacebookIcon from '@mui/icons-material/Facebook';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import CustomModal from '@/components/modal/custom-modal';
import CustomModalContentWrapper from '@/components/modal/custom-modal-content-wrapper';
import CustomModalCloseButton from '@/components/modal/custom-modal-close-button';
import SignupWithEmailModal from '@/components/modal/auth/signup-modal-form-modal';
import { useCustomAppContext } from '@/components/app-context';
import { LoginUserDocument, LoginUserInputType } from '@/lib/graphql/types/graphql';
import { useMutation } from '@apollo/client';

export type LoginModalProps = {
  triggerButton: ReactElement;
};

const LoginModal = ({ triggerButton }: LoginModalProps) => {
  const { setIsAuthN, setToastProps, toastProps } = useCustomAppContext();

  const [loginUser] = useMutation(LoginUserDocument, {
    onError() {},
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModalOpen = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const loginData: LoginUserInputType = {
      email: data.get('email')?.toString() ?? '',
      password: data.get('password')?.toString() ?? '',
    };

    loginUser({ variables: { input: loginData } }).then(({ data, errors }) => {
      if (errors) {
        const networkError = (errors as any).networkError;
        if (networkError) {
          setToastProps({
            ...toastProps,
            open: true,
            severity: 'error',
            message: networkError.result.errors[0].message,
          });
        }
      } else {
        console.log('You are logged in', data?.loginUser);
        setToastProps({
          ...toastProps,
          open: true,
          severity: 'success',
          message: 'Login Successfull',
        });
        // setIsAuthN(true);
        // setIsModalOpen(false);
      }
    });
  };

  return (
    <>
      {cloneElement(triggerButton, { onClick: () => handleModalOpen() })}
      <CustomModal open={isModalOpen} onClose={handleModalClose}>
        <CustomModalContentWrapper>
          <CustomModalCloseButton handleClose={handleModalClose} />

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
                <FormControl fullWidth margin="normal">
                  <TextField
                    required={true}
                    label="Email Address"
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus={true}
                  />
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <TextField
                    required={true}
                    label="Password"
                    id="password"
                    name="password"
                    type={'password'}
                    autoComplete="current-password"
                  />
                </FormControl>

                <FormControlLabel control={<Checkbox value="remember" color="secondary" />} label="Remember me" />

                <CustomModalButton
                  variant="contained"
                  color="secondary"
                  size="large"
                  sx={{ paddingX: 10 }}
                  type="submit"
                >
                  Log in
                </CustomModalButton>

                <Grid container>
                  <Grid item xs>
                    <Link href="#">Forgot password?</Link>
                  </Grid>
                  <Grid item>
                    <Link href="#">{"Don't have an account? Sign Up"}</Link>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ marginY: 2 }}>or</Divider>

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

              <SignupWithEmailModal
                triggerButton={
                  <CustomModalButton variant="outlined" color="primary" startIcon={<EmailIcon />} size="large">
                    Sign up with Email
                  </CustomModalButton>
                }
                onParentModalClose={handleModalClose}
              />
            </Box>
          </Container>
        </CustomModalContentWrapper>
      </CustomModal>
    </>
  );
};

export default LoginModal;
