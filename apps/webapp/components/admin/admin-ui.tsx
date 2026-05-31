import type { ReactNode } from 'react';
import { alpha } from '@mui/material/styles';
import { Box, CircularProgress, Stack, Typography, Chip, TextField, InputAdornment } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { SxProps, Theme } from '@mui/material/styles';

// Elevation Zero: flat surface, subtle border, no shadow. Matches docs/frontend/design-system.md.
// Dark mode lifts the surface above background.default since paper alone has insufficient contrast.
export const ADMIN_SURFACE_SX: SxProps<Theme> = {
  borderRadius: 2,
  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : theme.palette.background.paper),
  border: '1px solid',
  borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.10)' : theme.palette.divider),
  boxShadow: 'none',
  backgroundImage: 'none',
};

export const ADMIN_MUTED_SURFACE_SX: SxProps<Theme> = {
  ...ADMIN_SURFACE_SX,
  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.04),
  borderColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.18),
};

type AdminSectionHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function AdminSectionHeader({ title, description, eyebrow, meta, actions }: AdminSectionHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'center' }}
      spacing={2}
    >
      <Stack spacing={0.5}>
        {eyebrow ? (
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.1em' }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5" fontWeight={700}>
            {title}
          </Typography>
          {meta}
        </Stack>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
            {description}
          </Typography>
        ) : null}
      </Stack>
      {actions ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'default' | 'accent';
};

export function AdminMetricCard({ label, value, helper, tone = 'default' }: AdminMetricCardProps) {
  return (
    <Stack
      spacing={0.75}
      sx={{
        ...ADMIN_SURFACE_SX,
        p: { xs: 2.25, md: 2.75 },
        position: 'relative',
        overflow: 'hidden',
        ...(tone === 'accent'
          ? {
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.05),
              borderColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.36 : 0.22),
            }
          : null),
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.2 }}
      >
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
        {value}
      </Typography>
      {helper ? (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      ) : null}
    </Stack>
  );
}

type AdminEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <Stack spacing={1.25} alignItems="flex-start" sx={{ ...ADMIN_MUTED_SURFACE_SX, p: { xs: 3, md: 4 } }}>
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {action}
    </Stack>
  );
}

type AdminListFooterProps = {
  label: string;
  loadedCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  sentinelRef?: (node: Element | null) => void;
};

export function AdminListFooter({ label, loadedCount, hasMore, loadingMore, sentinelRef }: AdminListFooterProps) {
  return (
    <Stack spacing={1.5} alignItems="center" sx={{ pt: 1 }}>
      <Chip
        label={`${loadedCount} ${label}${loadedCount === 1 ? '' : 's'} loaded`}
        size="small"
        sx={{
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.08),
          color: (theme) => (theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main),
          fontWeight: 700,
        }}
      />
      {loadingMore ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading more…
          </Typography>
        </Stack>
      ) : hasMore ? (
        <Box ref={sentinelRef} sx={{ width: '100%', height: 1 }} />
      ) : (
        <Typography variant="body2" color="text.secondary">
          You&apos;ve reached the end of this list.
        </Typography>
      )}
    </Stack>
  );
}

type AdminListSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helperText?: string;
};

export function AdminListSearchField({ value, onChange, placeholder, helperText }: AdminListSearchFieldProps) {
  return (
    <Stack spacing={0.75}>
      <TextField
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        fullWidth
        size="small"
        sx={{ maxWidth: { xs: '100%', md: 420 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
      />
      {helperText ? (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      ) : null}
    </Stack>
  );
}
