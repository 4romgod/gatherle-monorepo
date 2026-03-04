'use client';

import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { verifyEmailAction } from '@/data/actions/server/auth';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';

interface Props {
  token?: string;
}

type Status = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailClient({ token }: Props) {
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token was provided. Please request a new link.');
      return;
    }

    verifyEmailAction(token).then((result) => {
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.error ?? 'Verification failed. Please request a new link.');
      }
    });
  }, [token]);

  if (status === 'verifying') {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={56} sx={{ mb: 2 }} />
        <Typography variant="h5" fontWeight={600}>
          Verifying your email…
        </Typography>
      </Box>
    );
  }

  if (status === 'success') {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography component="h1" variant="h4" fontWeight={700} marginBottom={1}>
          Email verified!
        </Typography>
        <Typography variant="body1" color="text.secondary" marginBottom={3}>
          Your email address has been verified. You can now log in.
        </Typography>
        <Button component={Link} href={ROUTES.AUTH.LOGIN} variant="contained" fullWidth>
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
      <Typography component="h1" variant="h4" fontWeight={700} marginBottom={1}>
        Verification failed
      </Typography>
      <Typography variant="body1" color="text.secondary" marginBottom={3}>
        {errorMessage}
      </Typography>
      <Button component={Link} href={ROUTES.AUTH.VERIFY_EMAIL_PENDING} variant="contained" fullWidth>
        Request a new link
      </Button>
    </Box>
  );
}
