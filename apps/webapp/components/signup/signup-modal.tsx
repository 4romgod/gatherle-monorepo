'use client';

import { Button, Typography, styled } from '@mui/material';
import CustomModal from '../modal/custom-modal';
import CustomModalContent from '@/components/modal/custom-modal-content-wrapper';
import FacebookIcon from '@mui/icons-material/Facebook';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import { ReactElement, useState } from 'react';
import Logo from '../logo';
import Link from 'next/link';

export type SignupModalProps = {
  triggerButton: ReactElement;
};

const StyledButton = styled(Button)(({ theme }) => ({
  width: '100%',
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.mode == 'dark' ? theme.palette.background.default : theme.palette.background.default,
  color: theme.palette.mode == 'dark' ? theme.palette.text.primary : theme.palette.text.secondary,
  borderColor: theme.palette.mode == 'dark' ? theme.palette.background.default : theme.palette.text.secondary,
}));

const SignupModal = (props: SignupModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <CustomModal
      triggerButton={props.triggerButton}
      isOpen={open}
      handleClose={() => setOpen(false)}
      handleOpen={() => setOpen(true)}
      modalContent={
        <CustomModalContent>
          <Logo />
          <Typography textAlign="center" variant="h4" fontWeight="bold" sx={{ marginBottom: 2 }}>
            Sign Up
          </Typography>
          <Typography variant="body1" textAlign="center" paddingBottom={3}>
            Already a member?
            <Link href={'/#'}>{' Log in here'}</Link>
          </Typography>
          <StyledButton variant="outlined" color="primary" startIcon={<FacebookIcon />} size="large">
            Continue with Facebook
          </StyledButton>
          <StyledButton
            variant="outlined"
            color="primary"
            startIcon={<GoogleIcon />}
            size="large"
            sx={{ paddingX: 10 }}
          >
            Continue with Google
          </StyledButton>
          <StyledButton variant="outlined" color="primary" startIcon={<EmailIcon />} size="large">
            Sign up with Email
          </StyledButton>
        </CustomModalContent>
      }
    />
  );
};

export default SignupModal;
