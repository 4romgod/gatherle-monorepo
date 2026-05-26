'use client';

import { useApolloClient } from '@apollo/client';
import { Box, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const PULL_TO_REFRESH_SETTLE_MS = 180;

type PullToRefreshShellProps = {
  children: React.ReactNode;
  indicatorTop?: number;
};

export function PullToRefreshShell({ children, indicatorTop = 80 }: PullToRefreshShellProps) {
  const apolloClient = useApolloClient();
  const { handlers, isPulling, isRefreshing, pullDistance, readyToRefresh } = usePullToRefresh({
    onRefresh: async () => {
      await apolloClient.reFetchObservableQueries();

      // Keep the indicator visible briefly so the completion state does not snap away.
      await new Promise((resolve) => setTimeout(resolve, PULL_TO_REFRESH_SETTLE_MS));
    },
  });

  const showIndicator = isRefreshing || pullDistance > 0;

  return (
    <Box sx={{ minHeight: 'inherit', position: 'relative' }}>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center',
          left: 0,
          pointerEvents: 'none',
          position: 'absolute',
          right: 0,
          top: indicatorTop,
          zIndex: 2,
        }}
      >
        {showIndicator ? (
          <Box
            sx={{
              alignItems: 'center',
              backdropFilter: 'blur(12px)',
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.92),
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 999,
              boxShadow: (theme) => theme.shadows[2],
              display: 'flex',
              gap: 1,
              px: 2,
              py: 1,
            }}
          >
            <CircularProgress
              color="primary"
              size={18}
              variant={isRefreshing ? 'indeterminate' : 'determinate'}
              value={Math.min(100, (pullDistance / 72) * 100)}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {isRefreshing ? 'Refreshing…' : readyToRefresh ? 'Release to refresh' : 'Pull to refresh'}
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Box
        {...handlers}
        data-testid="pull-to-refresh-shell-content"
        sx={{
          minHeight: 'inherit',
          transform: pullDistance === 0 ? 'none' : `translateY(${pullDistance}px)`,
          transition: isPulling || isRefreshing ? 'none' : 'transform 180ms ease',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
