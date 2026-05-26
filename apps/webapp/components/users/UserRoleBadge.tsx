import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { UserRole } from '@/data/graphql/types/graphql';
import { buildProfileBadges } from '@/lib/profileBadges';
import { ProfileBadge } from './ProfileBadge';

interface UserRoleBadgeProps {
  role: UserRole | null | undefined;
  /** Diameter of the badge in px. Defaults to 20. */
  size?: number;
  sx?: SxProps<Theme>;
}

/**
 * Inline role badge (like Twitter/Instagram verified icon).
 * Renders nothing for UserRole.User and UserRole.Guest.
 */
export default function UserRoleBadge({ role, size = 22, sx }: UserRoleBadgeProps) {
  if (!role) return null;
  const [badge] = buildProfileBadges({ userRole: role });
  if (!badge) return null;

  return (
    <Box sx={{ display: 'inline-flex', flexShrink: 0, ...sx }}>
      <ProfileBadge badge={badge} size={size} />
    </Box>
  );
}
