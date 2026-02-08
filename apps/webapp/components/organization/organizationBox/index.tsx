'use client';

import Link from 'next/link';
import { Box, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';
import Surface from '@/components/core/Surface';
import { Organization, OrganizationRole } from '@/data/graphql/types/graphql';
import { Settings } from '@mui/icons-material';

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
  return (
    <Surface
      component={Card}
      sx={{
        borderRadius: 3,
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      {logo ? (
        <Box
          sx={{
            height: 140,
            borderRadius: '18px 18px 0 0',
            backgroundImage: `url(${logo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        <Box
          sx={{
            height: 140,
            borderRadius: '18px 18px 0 0',
            backgroundColor: 'divider',
          }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {isFollowable ? 'Followable collective' : 'Private collective'}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {name ?? 'Untitled organization'}
          </Typography>
          {userRole && (
            <Chip
              label={userRole}
              size="small"
              color={roleColor}
              sx={{ fontWeight: 600, fontSize: '0.75rem', height: 22 }}
            />
          )}
        </Stack>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2} gap={1}>
          {tags?.slice(0, 4).map((tag) => (
            <Chip
              key={tag}
              label={`#${tag}`}
              size="small"
              sx={{
                fontWeight: 500,
                fontSize: '0.75rem',
                textTransform: 'none',
              }}
            />
          ))}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {followersCount ?? 0} followers
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            component={Link}
            href={slug ? ROUTES.ORGANIZATIONS.ORG(slug) : ROUTES.ORGANIZATIONS.ROOT}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            View
          </Button>
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
      </CardActions>
    </Surface>
  );
};

export default OrganizationCard;
