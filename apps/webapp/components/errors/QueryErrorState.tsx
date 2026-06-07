'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import { classifyFrontendFailure, type FrontendFailureKind } from '@/lib/utils/frontend-failure';

type QueryErrorStateProps = {
  compact?: boolean;
  error: unknown;
  onRetry?: () => void;
  resourceName: string;
};

function buildFailureCopy(kind: FrontendFailureKind, resourceName: string) {
  switch (kind) {
    case 'session-expired':
      return {
        actionLabel: 'Sign in again',
        message: `Your Gatherle session ended before we could load ${resourceName}. Sign in again to continue.`,
        title: 'Session expired',
      };
    case 'offline':
      return {
        actionLabel: 'Try again',
        message: `We could not reach Gatherle to load ${resourceName}. Check your connection, then retry.`,
        title: "You're offline",
      };
    case 'backend':
      return {
        actionLabel: 'Try again',
        message: `Gatherle is having trouble loading ${resourceName} right now. Retry in a moment.`,
        title: 'Gatherle is unavailable',
      };
    case 'unexpected':
    default:
      return {
        actionLabel: 'Try again',
        message: `Something went wrong while loading ${resourceName}. Retry in a moment.`,
        title: `We couldn't load ${resourceName}`,
      };
  }
}

export default function QueryErrorState({ compact = false, error, onRetry, resourceName }: QueryErrorStateProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const failureKind = classifyFrontendFailure(error);
  const copy = buildFailureCopy(failureKind, resourceName);
  const redirectTo = useMemo(() => {
    const query = searchParams?.toString();
    if (!pathname) {
      return ROUTES.ROOT;
    }

    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const loginHref = `${ROUTES.AUTH.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: failureKind === 'session-expired' ? 'warning.main' : 'error.main',
        borderRadius: 3,
        bgcolor: failureKind === 'session-expired' ? 'warning.50' : 'error.50',
        px: compact ? 2 : 3,
        py: compact ? 2 : 3,
      }}
    >
      <Stack
        spacing={1.5}
        alignItems={compact ? 'flex-start' : 'center'}
        sx={{ textAlign: compact ? 'left' : 'center' }}
      >
        <Box>
          <Typography fontWeight={700} sx={{ color: 'text.primary', mb: 0.5 }}>
            {copy.title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {copy.message}
          </Typography>
        </Box>
        {failureKind === 'session-expired' ? (
          <Button component={Link} href={loginHref} variant="contained" size={compact ? 'small' : 'medium'}>
            {copy.actionLabel}
          </Button>
        ) : onRetry ? (
          <Button onClick={onRetry} variant="contained" size={compact ? 'small' : 'medium'}>
            {copy.actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
