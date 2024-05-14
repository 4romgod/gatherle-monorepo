'use client';

import Link from 'next/link';
import Logo from '@/components/logo';
import { ReactElement, cloneElement, useState, useRef } from 'react';
import {
  Box,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
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
import { Visibility, VisibilityOff } from '@mui/icons-material';

export type LoginModalProps = {
  triggerButton: ReactElement;
};

const LoginModal = ({ triggerButton }: LoginModalProps) => {
  const { setIsAuthN } = useCustomAppContext();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModalOpen = () => setIsModalOpen(true);
  const handleModalClose = () => setIsModalOpen(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const loginData = {
      email: emailRef.current?.value,
      password: passwordRef.current?.value,
    };
    console.log(loginData);

    // setIsAuthN(true);
    // setIsModalOpen(false);
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
                    required
                    label="Email Address"
                    id="email"
                    name="email"
                    type="email"
                    autoFocus
                    // value={loginData.email}
                    // onChange={handleChange}
                    inputRef={emailRef}
                  />
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <TextField
                    required
                    label="Password"
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    // value={loginData.password}
                    // onChange={handleChange}
                    inputRef={passwordRef}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <VisibilityOff color="error" /> : <Visibility color="error" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>
                <FormControlLabel control={<Checkbox value="remember" color="secondary" />} label="Remember me" />
                <Grid container spacing={1} paddingTop={3}>
                  <Grid item xs>
                    <Link href="#">Forgot password?</Link>
                  </Grid>
                </Grid>
                <CustomModalButton
                  variant="contained"
                  color="secondary"
                  size="large"
                  sx={{ paddingX: 10 }}
                  type="submit"
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
