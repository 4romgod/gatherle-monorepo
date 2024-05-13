'use client';

import Logo from '@/components/logo';
import { ReactElement, cloneElement, useState } from 'react';
import { Box, Container, TextField, Typography } from '@mui/material';
import CustomModal from '@/components/modal/custom-modal';
import CustomModalContentWrapper from '@/components/modal/custom-modal-content-wrapper';
import CustomModalButton from '@/components/modal/custom-modal-button';
import CustomModalCloseButton from '@/components/modal/custom-modal-close-button';
import { useCustomAppContext } from '@/components/app-context';

export type SignupWithEmailModalProps = {
  triggerButton: ReactElement;
  onParentClose?: () => void;
};

const SignupWithEmailModal = ({ triggerButton, onParentClose }: SignupWithEmailModalProps) => {
  const { setIsAuthN } = useCustomAppContext();

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    onParentClose && onParentClose();
    setOpen(false);
  };

  const handleSignup = () => {
    setIsAuthN(true);
    handleClose();
  };

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
      {cloneElement(triggerButton, { onClick: handleOpen })}
      <CustomModal open={open} onClose={handleClose}>
        <CustomModalContentWrapper>
          <CustomModalCloseButton handleClose={handleClose} />

          <Logo />
          <Typography textAlign="center" variant="h4" fontWeight="bold">
            Sign up
          </Typography>

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
                  id="given_name"
                  label="First Name"
                  name="given_name"
                  autoComplete="given_name"
                  autoFocus
                  color="secondary"
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="family_name"
                  label="Last Name"
                  name="family_name"
                  autoComplete="family_name"
                  autoFocus
                  color="secondary"
                />
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
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirm-password"
                  label="Confirm Password"
                  type="password"
                  id="confirm-password"
                  autoComplete="current-password"
                  color="secondary"
                />

                <CustomModalButton
                  variant="contained"
                  color="secondary"
                  size="large"
                  sx={{ mt: 2 }}
                  onClick={handleSignup}
                >
                  Sign up
                </CustomModalButton>
              </Box>
            </Box>
          </Container>
        </CustomModalContentWrapper>
      </CustomModal>
    </>
  );
};

export default SignupWithEmailModal;
