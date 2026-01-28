'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Typography, Button, Avatar, Stack, Chip } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import { ROUTES } from '@/lib/constants';

/**
 * Represents a popular organization with follower count for sidebar display
 */
export type PopularOrganization = {
  orgId: string;
  slug?: string;
  name?: string;
  description?: string | null;
  logo?: string | null;
  followersCount: number;
  isFollowable?: boolean;
  tags?: string[] | null;
};

export type PopularOrganizerBoxProps = {
  organization: PopularOrganization;
};

export default function PopularOrganizerBox({ organization }: PopularOrganizerBoxProps) {
  const { name, slug, description, logo, followersCount, tags } = organization;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600}>
            Most Popular
          </Typography>
          <Chip
            icon={<GroupIcon fontSize="small" />}
            label={`${(followersCount ?? 0).toLocaleString()} followers`}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Stack>

        {/* Organization Details */}
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
          <Avatar
            src={logo ?? undefined}
            alt={name || 'Organization'}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {!logo && name?.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {name || 'Unnamed Organization'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {description || 'No description provided.'}
            </Typography>
          </Box>
        </Stack>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {tags.slice(0, 3).map((tag) => (
              <Button key={tag} size="small" variant="outlined" sx={{ textTransform: 'none', fontWeight: 500 }}>
                #{tag}
              </Button>
            ))}
            {tags.length > 3 && <Chip label={`+${tags.length - 3} more`} size="small" variant="outlined" />}
          </Stack>
        )}

        {/* CTA Button */}
        <Button
          fullWidth
          variant="contained"
          component={Link}
          href={slug ? ROUTES.ORGANIZATIONS.ORG(slug) : ROUTES.ORGANIZATIONS.ROOT}
          aria-label={`View events by ${name || 'this organization'}`}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          View Events
        </Button>
      </CardContent>
    </Card>
  );
}
