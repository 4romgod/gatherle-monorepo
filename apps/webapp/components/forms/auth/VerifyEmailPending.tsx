'use client';

import { Box, Button, TextField, Typography } from '@mui/material';
import { MarkEmailUnread } from '@mui/icons-material';
import { useActionState, useEffect, useState } from 'react';
import { requestEmailVerificationAction } from '@/data/actions/server/auth';
import { useSession } from 'next-auth/react';
import { useAppContext } from '@/hooks/useAppContext';
import { logger } from '@/lib/utils';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

export default function VerifyEmailPendingClient() {
  const { data: session } = useSession();
  const { setToastProps, toastProps } = useAppContext();
  const [formState, formAction, isPending] = useActionState(requestEmailVerificationAction, {});

  const sessionEmail = (session?.user as { email?: string } | undefined)?.email ?? '';
  const [manualEmail, setManualEmail] = useState('');

  // Use the session email if available, otherwise fall back to what the user typed
  const effectiveEmail = sessionEmail || manualEmail;

  useEffect(() => {
    if (formState.apiError) {
      logger.warn('Resend verification error', { error: formState.apiError });
      setToastProps((prev) => ({ ...prev, open: true, severity: 'error', message: formState.apiError! }));
    }
    if (formState.data) {
      setToastProps((prev) => ({
        ...prev,
        open: true,
        severity: 'success',
        message: 'Verification email sent! Please check your inbox.',
      }));
    }
  }, [formState, setToastProps]);

  // Visitor arrived here without a session (e.g. typed the URL directly)
  if (!sessionEmail) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <MarkEmailUnread sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

        <Typography component="h1" variant="h4" fontWeight={700} marginBottom={1}>
          Verify your email
        </Typography>

        <Typography variant="body1" color="text.secondary" marginBottom={4}>
          Enter your email address below and we&apos;ll send you a new verification link.
        </Typography>

        <Box component="form" action={formAction} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            id="verify-email-pending-email"
            label="Email address"
            type="email"
            name="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={isPending || !manualEmail} fullWidth>
            {isPending ? 'Sending…' : 'Send verification email'}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Don&apos;t have an account?{' '}
          <Link href={ROUTES.AUTH.REGISTER} style={{ color: '#1e88e5' }}>
            Register here
          </Link>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <MarkEmailUnread sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

      <Typography component="h1" variant="h4" fontWeight={700} marginBottom={1}>
        Check your inbox
      </Typography>

      <Typography variant="body1" color="text.secondary" marginBottom={1}>
        We&apos;ve sent a verification link to
      </Typography>
      <Typography variant="body1" fontWeight={600} marginBottom={3}>
        {sessionEmail}
      </Typography>

      <Typography variant="body2" color="text.secondary" marginBottom={4}>
        Click the link in the email to verify your account. The link expires in 24 hours.
      </Typography>

      <Box component="form" action={formAction}>
        <input type="hidden" name="email" value={effectiveEmail} />
        <Button type="submit" variant="outlined" disabled={isPending} fullWidth>
          {isPending ? 'Sending…' : 'Resend verification email'}
        </Button>
      </Box>
    </Box>
  );
}
