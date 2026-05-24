'use client';

import Link from 'next/link';
import { Avatar, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import { Organization, OrganizationRole } from '@/data/graphql/types/graphql';
import { Settings } from '@mui/icons-material';
import RemoteImage from '@/components/core/RemoteImage';

export type OrganizationCardProps = {
  organization: Organization;
  userRole?: OrganizationRole;
};

const OrganizationCard = ({ organization, userRole }: OrganizationCardProps) => {
  const { name, slug, description, logo, tags, followersCount, isFollowable } = organization;
  const canManage =
    Boolean(slug) && Boolean(userRole) && (userRole === OrganizationRole.Owner || userRole === OrganizationRole.Admin);

  const manageHref = slug ? ROUTES.ACCOUNT.ORGANIZATIONS.SETTINGS(slug) : ROUTES.ACCOUNT.ORGANIZATIONS.ROOT;
  const roleColor = userRole === OrganizationRole.Owner ? 'primary' : 'secondary';
  const organizationHref = slug ? ROUTES.ORGANIZATIONS.ORG(slug) : ROUTES.ORGANIZATIONS.ROOT;
  const initials = (name ?? 'Organization')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Box
      sx={{
        borderRadius: 3,
        display: 'flex',
        height: '100%',
        p: 1.75,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
        <Box component={Link} href={organizationHref} sx={{ flexShrink: 0, textDecoration: 'none' }}>
          <RemoteImage
            alt={name ?? 'Organization logo'}
            fallback={
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  color: 'primary.main',
                  fontWeight: 900,
                  height: 58,
                  width: 58,
                }}
              >
                {initials}
              </Avatar>
            }
            src={logo}
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 2,
              height: 58,
              width: 58,
            }}
          />
        </Box>

        <Box
          component={Link}
          href={organizationHref}
          sx={{ color: 'inherit', flex: 1, minWidth: 0, textDecoration: 'none' }}
        >
          <Typography fontWeight={800} noWrap variant="subtitle1">
            {name ?? 'Untitled organization'}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
            variant="body2"
          >
            {description || 'Community-led organizer on Gatherle.'}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
            <Typography color="text.primary" fontWeight={800} variant="caption">
              {(followersCount ?? 0).toLocaleString()} {(followersCount ?? 0) === 1 ? 'follower' : 'followers'}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {isFollowable ? 'Followable' : 'Private'}
            </Typography>
            {tags?.slice(0, 2).map((tag) => (
              <Typography key={tag} color="text.secondary" variant="caption">
                #{tag}
              </Typography>
            ))}
          </Stack>
        </Box>

        <Stack spacing={1} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          {userRole && (
            <Chip
              label={userRole}
              size="small"
              color={roleColor}
              sx={{ borderRadius: 999, fontWeight: 800, fontSize: '0.75rem', height: 26 }}
            />
          )}
          {canManage && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              component={Link}
              href={manageHref}
              startIcon={<Settings fontSize="small" />}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              Manage
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default OrganizationCard;
