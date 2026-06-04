'use client';

import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Stack } from '@mui/material';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';
import { ROUTES } from '@/lib/constants';
import { FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

type SocialAuthButtonsProps = {
  showEmailSignupButton?: boolean;
};

export default function SocialAuthButtons({ showEmailSignupButton = false }: SocialAuthButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const requestedRedirectTo = searchParams.get('redirectTo')?.trim() ?? '';
  const safeRedirectTo =
    requestedRedirectTo.startsWith('/') && !requestedRedirectTo.startsWith('//') ? requestedRedirectTo : null;
  const redirectTo = safeRedirectTo ?? DEFAULT_LOGIN_REDIRECT;
  const registerHref = safeRedirectTo
    ? `${ROUTES.AUTH.REGISTER}?redirectTo=${encodeURIComponent(safeRedirectTo)}`
    : ROUTES.AUTH.REGISTER;

  const handleProviderSignIn = (provider: 'google' | 'apple') => {
    startTransition(() => {
      if (provider === 'google') {
        void signIn(provider, { redirectTo }, { prompt: 'select_account' });
        return;
      }

      void signIn(provider, { redirectTo });
    });
  };

  return (
    <Stack spacing={1}>
      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<FcGoogle />}
        sx={{
          mt: 1,
          mb: 1,
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: 2,
        }}
        disabled={isPending}
        onClick={() => handleProviderSignIn('google')}
      >
        Continue with Google
      </Button>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<FaApple />}
        sx={{
          mt: 1,
          mb: 1,
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: 2,
        }}
        disabled={isPending}
        onClick={() => handleProviderSignIn('apple')}
      >
        Continue with Apple
      </Button>

      {showEmailSignupButton ? (
        <Button
          variant="outlined"
          size="large"
          fullWidth
          component={Link}
          href={registerHref}
          sx={{
            mt: 1,
            mb: 1,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          Sign up with Email
        </Button>
      ) : null}
    </Stack>
  );
}
