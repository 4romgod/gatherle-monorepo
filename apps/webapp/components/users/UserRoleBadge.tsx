import { Tooltip, Box } from '@mui/material';
import { Mic as MicIcon, VerifiedUser as ShieldIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { UserRole } from '@/data/graphql/types/graphql';

interface UserRoleBadgeProps {
  role: UserRole | null | undefined;
  /** Diameter of the badge in px. Defaults to 20. */
  size?: number;
  sx?: SxProps<Theme>;
}

const ROLE_BADGE_CONFIG: Partial<
  Record<
    UserRole,
    {
      label: string;
      Icon: typeof MicIcon;
      gradient: string;
    }
  >
> = {
  [UserRole.Host]: {
    label: 'Verified Host',
    Icon: MicIcon,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  },
  [UserRole.Admin]: {
    label: 'Platform Admin',
    Icon: ShieldIcon,
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
  },
};

/**
 * Inline role badge (like Twitter/Instagram verified icon).
 * Renders nothing for UserRole.User and UserRole.Guest.
 */
export default function UserRoleBadge({ role, size = 20, sx }: UserRoleBadgeProps) {
  if (!role) return null;
  const config = ROLE_BADGE_CONFIG[role];
  if (!config) return null;

  const { label, Icon, gradient } = config;

  return (
    <Tooltip title={label} arrow placement="top">
      <Box
        role="img"
        aria-label={label}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          background: gradient,
          flexShrink: 0,
          cursor: 'default',
          ...sx,
        }}
      >
        <Icon sx={{ fontSize: size * 0.58, color: 'common.white' }} />
      </Box>
    </Tooltip>
  );
}
