'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/components/logo';
import { Box, Button, Container, Divider, FormControl, Grid, TextField, Typography } from '@mui/material';
import { Facebook, Google, Email } from '@mui/icons-material';
import CustomDatePicker from '@/components/date-picker';
import { CreateUserInputType, Gender } from '@/lib/graphql/types/graphql';

const RegisterPage = () => {
  const router = useRouter();

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
  };

  return (
    <Container maxWidth="xs">
      <Logo />

      <Typography textAlign="center" component="h1" variant="h5" marginTop={2}>
        Sign Up
      </Typography>

      <Typography variant="body1" textAlign="center" paddingBottom={3}>
        <span>Already a member?&nbsp;</span>
        <a style={{ color: '#1e88e5', cursor: 'pointer' }} onClick={() => router.push('/auth/login')}>
          {'Log in here'}
        </a>
      </Typography>

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

        <Button variant="contained" color="secondary" fullWidth={true} sx={{ mt: 2 }} type="submit">
          Sign up
        </Button>
      </Box>

      <Divider sx={{ marginY: 2 }}>or</Divider>

      <Button variant="outlined" fullWidth={true} startIcon={<Facebook />} sx={{ mt: 1, mb: 1 }}>
        Continue with Facebook
      </Button>

      <Button variant="outlined" fullWidth={true} startIcon={<Google />} sx={{ mt: 1, mb: 1 }}>
        Continue with Google
      </Button>
    </Container>
  );
};

export default RegisterPage;
