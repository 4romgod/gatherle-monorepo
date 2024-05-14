import Logo from '@/components/logo';
import { ReactElement, cloneElement, useState, useRef } from 'react';
import { Box, Container, FormControl, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import CustomModal from '@/components/modal/custom-modal';
import CustomModalContentWrapper from '@/components/modal/custom-modal-content-wrapper';
import CustomModalButton from '@/components/modal/custom-modal-button';
import CustomModalCloseButton from '@/components/modal/custom-modal-close-button';
import { useCustomAppContext } from '@/components/app-context';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export type SignupWithEmailModalProps = {
  triggerButton: ReactElement;
  onParentModalClose?: () => void;
};

const SignupWithEmailModal = ({ triggerButton, onParentModalClose }: SignupWithEmailModalProps) => {
  const { setIsAuthN } = useCustomAppContext();
  const givenNameRef = useRef<HTMLInputElement>(null);
  const familyNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModalOpen = () => setIsModalOpen(true);
  const handleModalClose = () => {
    onParentModalClose && onParentModalClose();
    setIsModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const signinData = {
      given_name: givenNameRef.current?.value,
      family_name: familyNameRef.current?.value,
      email: emailRef.current?.value,
      password: passwordRef.current?.value,
    };
    console.log(signinData);

    // setIsAuthN(true);
    // handleModalClose();
  };

  return (
    <>
      {cloneElement(triggerButton, { onClick: handleModalOpen })}
      <CustomModal open={isModalOpen} onClose={handleModalClose}>
        <CustomModalContentWrapper>
          <CustomModalCloseButton handleClose={handleModalClose} />

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
              <form onSubmit={handleSubmit} noValidate>
                <FormControl fullWidth margin="normal">
                  <TextField required label="First Name" name="given_name" variant="outlined" inputRef={givenNameRef} />
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <TextField
                    required
                    label="Last Name"
                    name="family_name"
                    variant="outlined"
                    inputRef={familyNameRef}
                  />
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <TextField required label="Email Address" name="email" variant="outlined" inputRef={emailRef} />
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <TextField
                    required
                    label="Password"
                    name="password"
                    variant="outlined"
                    type={showPassword ? 'text' : 'password'}
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

                <CustomModalButton variant="contained" color="secondary" size="large" sx={{ mt: 2 }} type="submit">
                  Sign up
                </CustomModalButton>
              </form>
            </Box>
          </Container>
        </CustomModalContentWrapper>
      </CustomModal>
    </>
  );
};

export default SignupWithEmailModal;
