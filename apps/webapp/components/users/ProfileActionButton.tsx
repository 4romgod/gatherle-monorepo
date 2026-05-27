'use client';

import Link from 'next/link';
import type { IconType } from 'react-icons';
import { Box } from '@mui/material';
import { WEB_RADIUS } from '@/lib/constants/radius';

type ProfileActionButtonProps = {
  href?: string;
  icon: IconType;
  label: string;
  onClick?: () => void;
};

const profileActionButtonSx = {
  alignItems: 'center',
  appearance: 'none',
  backgroundColor: 'action.disabledBackground',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: WEB_RADIUS.control,
  color: 'text.primary',
  cursor: 'pointer',
  display: 'flex',
  flex: 1,
  gap: 0.75,
  justifyContent: 'center',
  minHeight: 38,
  minWidth: 0,
  px: 1.5,
  textDecoration: 'none',
  transition: 'opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
  '&:hover': {
    borderColor: 'text.secondary',
    transform: 'translateY(-1px)',
  },
  '&:active': {
    opacity: 0.9,
    transform: 'translateY(0)',
  },
} as const;

const labelSx = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

export function ProfileActionButton({ href, icon: Icon, label, onClick }: ProfileActionButtonProps) {
  const content = (
    <>
      <Icon size={14} />
      <Box component="span" sx={labelSx}>
        {label}
      </Box>
    </>
  );

  if (href) {
    return (
      <Box component={Link} href={href} sx={profileActionButtonSx}>
        {content}
      </Box>
    );
  }

  return (
    <Box component="button" onClick={onClick} sx={profileActionButtonSx} type="button">
      {content}
    </Box>
  );
}
