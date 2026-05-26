'use client';

import Link from 'next/link';
import { Avatar, Box, Typography } from '@mui/material';

type ProfileConnectionRowProps = {
  avatarSrc?: string | null;
  avatarVariant?: 'circular' | 'rounded';
  description: string;
  href: string;
  subtitle: string;
  title: string;
};

export function ProfileConnectionRow({
  avatarSrc,
  avatarVariant = 'circular',
  description,
  href,
  subtitle,
  title,
}: ProfileConnectionRowProps) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        alignItems: 'center',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        display: 'flex',
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        textDecoration: 'none',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: 'text.secondary',
          boxShadow: (theme) => theme.shadows[2],
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Avatar
        src={avatarSrc || undefined}
        variant={avatarVariant}
        sx={{
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          height: 52,
          width: 52,
        }}
      >
        {title.charAt(0).toUpperCase()}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            color: 'text.primary',
            fontSize: '0.95rem',
            fontWeight: 700,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            color: 'text.secondary',
            fontSize: '0.82rem',
            fontWeight: 500,
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitle}
        </Typography>
        <Typography
          sx={{
            color: 'text.secondary',
            display: '-webkit-box',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            mt: 0.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
