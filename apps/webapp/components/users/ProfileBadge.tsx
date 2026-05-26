'use client';

import { alpha } from '@mui/material/styles';
import { Box, Tooltip } from '@mui/material';
import { HiLightningBolt } from 'react-icons/hi';
import { RiShieldStarFill } from 'react-icons/ri';
import type { Theme } from '@mui/material/styles';

export type ProfileBadgeTone = 'primary' | 'secondary' | 'success';

export type ProfileBadgeIcon = 'lightning-bolt' | 'shield-star';

export type ProfileBadgeModel = {
  description?: string;
  icon: ProfileBadgeIcon;
  label: string;
  tone?: ProfileBadgeTone;
};

type ProfileBadgeProps = {
  badge: ProfileBadgeModel;
  size?: number;
};

const PROFILE_BADGE_ICONS = {
  'lightning-bolt': HiLightningBolt,
  'shield-star': RiShieldStarFill,
} as const;

function getProfileBadgePalette(theme: Theme, tone: ProfileBadgeTone) {
  if (tone === 'secondary') {
    return {
      end: '#ffb06d',
      iconColor: theme.palette.common.white,
      shadowColor: theme.palette.secondary.main,
      start: theme.palette.secondary.main,
    };
  }

  if (tone === 'success') {
    return {
      end: '#6ee7b7',
      iconColor: theme.palette.common.white,
      shadowColor: theme.palette.success.main,
      start: theme.palette.success.main,
    };
  }

  return {
    end: '#8b7fff',
    iconColor: theme.palette.common.white,
    shadowColor: theme.palette.primary.main,
    start: theme.palette.primary.main,
  };
}

export function ProfileBadge({ badge, size = 22 }: ProfileBadgeProps) {
  const Icon = PROFILE_BADGE_ICONS[badge.icon];
  const tone = badge.tone ?? 'primary';
  const iconSize = Math.max(12, Math.round(size * 0.59));
  const radius = Math.round(size * 0.36);

  return (
    <Tooltip arrow title={badge.description ?? `${badge.label} badge`}>
      <Box component="span" sx={{ borderRadius: `${radius}px`, display: 'inline-flex' }}>
        <Box
          sx={(theme) => {
            const palette = getProfileBadgePalette(theme, tone);

            return {
              alignItems: 'center',
              background: `linear-gradient(135deg, ${palette.start} 0%, ${palette.end} 100%)`,
              borderRadius: `${radius}px`,
              boxShadow: `0 4px 8px ${alpha(palette.shadowColor, 0.22)}`,
              color: palette.iconColor,
              display: 'flex',
              height: size,
              justifyContent: 'center',
              width: size,
            };
          }}
        >
          <Icon size={iconSize} />
        </Box>
      </Box>
    </Tooltip>
  );
}
