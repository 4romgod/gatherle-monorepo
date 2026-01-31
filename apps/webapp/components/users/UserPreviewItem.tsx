import type { AvatarProps, PaperProps } from '@mui/material';
import { Avatar, Box, Chip, Paper, Stack, SxProps, Theme, Typography } from '@mui/material';
import Link, { LinkProps } from 'next/link';
import type { ReactElement, ReactNode } from 'react';

export type UserPreviewChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

interface UserPreviewItemProps {
  name: string;
  username: string;
  avatarUrl?: string | null;
  chipLabel?: string;
  chipColor?: UserPreviewChipColor;
  chipVariant?: 'filled' | 'outlined';
  chipIcon?: ReactElement;
  secondaryText?: string | ReactNode;
  avatarProps?: Omit<AvatarProps, 'src'>;
  sx?: SxProps<Theme>;
  linkProps?: Omit<LinkProps, 'href'>;
  paperProps?: PaperProps;
  masked?: boolean;
  maskLabel?: string;
}

export default function UserPreviewItem({
  name,
  username,
  avatarUrl,
  chipLabel,
  chipColor = 'primary',
  chipVariant = 'filled',
  chipIcon,
  secondaryText,
  avatarProps,
  sx,
  linkProps,
  paperProps,
  masked = false,
  maskLabel,
}: UserPreviewItemProps) {
  const metaText = secondaryText ?? (username ? `@${username}` : undefined);
  const avatarFallback = username?.charAt(0) ?? name?.charAt(0) ?? '?';

  const content = (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', ...sx }}>
      <Avatar src={avatarUrl || undefined} {...avatarProps}>
        {!avatarUrl && avatarFallback.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" fontWeight={600} noWrap>
          {name}
        </Typography>
        {metaText && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {metaText}
          </Typography>
        )}
      </Box>
      {chipLabel && (
        <Chip
          label={chipLabel}
          color={chipColor}
          variant={chipVariant}
          size="small"
          icon={chipIcon}
          sx={{ alignSelf: 'flex-start' }}
        />
      )}
    </Stack>
  );

  const paperSxProp = paperProps?.sx;
  const computedPaperSx: SxProps<Theme> = [
    { width: '100%' },
    ...(Array.isArray(paperSxProp) ? paperSxProp : [paperSxProp ?? {}]),
    ...(masked ? [{ position: 'relative', overflow: 'hidden' }] : []),
  ];
  const contentWrapperSx = masked
    ? { filter: 'blur(3px)', opacity: 0.7, pointerEvents: 'none', transition: 'filter 0.2s' }
    : undefined;
  const overlayLabel = maskLabel ?? 'Private profile';
  const overlaySubtext = 'Follow to view full details';

  return (
    <Link
      href={`/users/${username}`}
      {...linkProps}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <Paper elevation={paperProps?.elevation ?? 0} {...paperProps} sx={computedPaperSx}>
        <Box sx={contentWrapperSx}>{content}</Box>
        {masked && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.45)',
              color: 'common.white',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {overlayLabel}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', mt: 0.25 }}>
              {overlaySubtext}
            </Typography>
          </Box>
        )}
      </Paper>
    </Link>
  );
}
