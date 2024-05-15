import Logo from '@/components/logo';
import { ReactElement, cloneElement, useState } from 'react';
import { Box, Container, FormControl, Grid, TextField, Typography } from '@mui/material';
import CustomModal from '@/components/modal/custom-modal';
import CustomModalContentWrapper from '@/components/modal/custom-modal-content-wrapper';
import CustomModalButton from '@/components/modal/custom-modal-button';
import CustomModalCloseButton from '@/components/modal/custom-modal-close-button';
import { useCustomAppContext } from '@/components/app-context';
import { CreateUserInputType, Gender } from '@/lib/graphql/types/graphql';
import CustomDatePicker from '@/components/date-picker';

export type SignupWithEmailModalProps = {
  triggerButton: ReactElement;
  onParentModalClose?: () => void;
};

const SignupWithEmailModal = ({ triggerButton, onParentModalClose }: SignupWithEmailModalProps) => {
  const { setIsAuthN } = useCustomAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModalOpen = () => setIsModalOpen(true);
  const handleModalClose = () => {
    onParentModalClose && onParentModalClose();
    setIsModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const signinData: CreateUserInputType = {
      given_name: data.get('given_name')?.toString() ?? '',
      family_name: data.get('family_name')?.toString() ?? '',
      address: data.get('address')?.toString() ?? '',
      gender: Gender.Male,
      phone_number: data.get('phone_number')?.toString() ?? '',
      birthdate: data.get('birthdate')?.toString() ?? '',
      email: data.get('email')?.toString() ?? '',
      password: data.get('password')?.toString() ?? '',
    };

    console.log('signinData', signinData);

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
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                      <TextField required label="First Name" name="given_name" variant="outlined" />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="normal">
                      <TextField required label="Last Name" name="family_name" variant="outlined" />
                    </FormControl>
                  </Grid>
                </Grid>
                <FormControl fullWidth margin="normal">
                  <TextField required label="Email Address" name="email" variant="outlined" />
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <TextField required label="Password" name="password" variant="outlined" type={'password'} />
                </FormControl>
                <FormControl fullWidth margin="normal">
                  <CustomDatePicker label="Date of Birth" name="birthdate" />
                </FormControl>

                <CustomModalButton variant="contained" color="secondary" size="large" sx={{ mt: 2 }} type="submit">
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
