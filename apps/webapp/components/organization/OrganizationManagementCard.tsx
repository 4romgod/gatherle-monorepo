'use client';

import Link from 'next/link';
import { Avatar, Box, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Business, Settings, People } from '@mui/icons-material';
import { ROUTES } from '@/lib/constants';
import { Organization, OrganizationRole } from '@/data/graphql/types/graphql';

export type OrganizationManagementCardProps = {
  organization: Organization;
  userRole?: OrganizationRole;
};

export default function OrganizationManagementCard({ organization, userRole }: OrganizationManagementCardProps) {
  const { name, slug, description, logo, tags, followersCount } = organization;

  const roleColor = userRole === OrganizationRole.Owner ? 'primary' : 'secondary';

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: { xs: 3, md: 4 } }}>
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
          <Avatar
            src={logo ?? undefined}
            alt={name}
            sx={{
              width: 60,
              height: 60,
              bgcolor: 'primary.main',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {name?.charAt(0).toUpperCase() || <Business />}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, wordBreak: 'break-word' }}>
              {name}
            </Typography>
            {userRole && (
              <Chip
                label={userRole}
                size="small"
                color={roleColor}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 22,
                }}
              />
            )}
          </Box>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.6,
          }}
        >
          {description || 'No description provided'}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <People fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {followersCount?.toLocaleString() ?? 0}
            </Typography>
          </Stack>
        </Stack>

        {tags && tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
            {tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            ))}
            {tags.length > 3 && (
              <Chip
                label={`+${tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            )}
          </Stack>
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
        <Button
          component={Link}
          href={slug ? ROUTES.ORGANIZATIONS.ORG(slug) : ROUTES.ORGANIZATIONS.ROOT}
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          View Public Page
        </Button>
        {slug && (userRole === OrganizationRole.Owner || userRole === OrganizationRole.Admin) && (
          <Button
            component={Link}
            href={ROUTES.ACCOUNT.ORGANIZATIONS.SETTINGS(slug)}
            variant="contained"
            size="small"
            startIcon={<Settings />}
            fullWidth
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Manage
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
