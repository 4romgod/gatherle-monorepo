'use client';

import Link from 'next/link';
import { Box, ButtonBase, Typography } from '@mui/material';

type ProfileStatProps = {
  href?: string;
  label: string;
  onClick?: () => void;
  value: string;
};

const statContentSx = {
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 0.25,
  minWidth: 0,
  textAlign: 'center',
} as const;

const interactiveStatSx = {
  ...statContentSx,
  borderRadius: 2,
  py: { xs: 0, md: 0.25 },
  transition: 'opacity 0.2s ease, transform 0.2s ease',
  '&:hover': {
    opacity: 0.82,
  },
} as const;

function ProfileStatContent({ label, value }: Omit<ProfileStatProps, 'href' | 'onClick'>) {
  return (
    <>
      <Typography
        sx={(theme) => ({
          color: theme.palette.text.primary,
          fontFamily: theme.typography.h4.fontFamily,
          fontSize: { xs: '1.2rem', md: '1.375rem' },
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
        })}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: { xs: '0.72rem', md: '0.75rem' },
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
    </>
  );
}

export function ProfileStat({ href, label, onClick, value }: ProfileStatProps) {
  if (href) {
    return (
      <ButtonBase LinkComponent={Link} href={href} sx={interactiveStatSx}>
        <ProfileStatContent label={label} value={value} />
      </ButtonBase>
    );
  }

  if (onClick) {
    return (
      <ButtonBase onClick={onClick} sx={interactiveStatSx}>
        <ProfileStatContent label={label} value={value} />
      </ButtonBase>
    );
  }

  return (
    <Box sx={statContentSx}>
      <ProfileStatContent label={label} value={value} />
    </Box>
  );
}
