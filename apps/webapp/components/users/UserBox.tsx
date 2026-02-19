'use client';

import { Typography, Grid, Avatar, Box, Stack, Chip, Button, Card } from '@mui/material';
import { LocationOn, People } from '@mui/icons-material';
import { User, FollowTargetType } from '@/data/graphql/types/graphql';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { getAvatarSrc, getDisplayName } from '@/lib/utils';
import FollowButton from './FollowButton';
import { useSession } from 'next-auth/react';
import { alpha, useTheme } from '@mui/material/styles';

interface UserBoxProps {
  user: User;
}

export default function UserBox({ user }: UserBoxProps) {
  const { data: session } = useSession();
  const theme = useTheme();
  const displayName = getDisplayName(user) !== 'Account' ? getDisplayName(user) : user.username;
  const isOwnProfile = session?.user?.userId === user.userId;

  const location = [user.location?.city, user.location?.country].filter(Boolean).join(', ');
  const interests = user.interests?.slice(0, 3) || [];

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Card content sections: Avatar + identity, Bio, Location & interests, Action */}
        <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Avatar + identity */}
          <Link href={ROUTES.USERS.USER(user.username)} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={getAvatarSrc(user)}
                alt={displayName}
                sx={{
                  width: 56,
                  height: 56,
                  border: '2px solid',
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }}
              >
                {displayName?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} noWrap color="text.primary">
                  {displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{user.username}
                </Typography>
                {typeof user.followersCount === 'number' && (
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
                    <People sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {(user.followersCount || 0).toLocaleString()}{' '}
                      {user.followersCount === 1 ? 'follower' : 'followers'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>
          </Link>

          {/* Bio */}
          {user.bio && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 2,
                display: '-webkit-box',
                overflow: 'hidden',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {user.bio}
            </Typography>
          )}

          {/* Location & interests */}
          {(location || interests.length > 0) && (
            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  size="small"
                  sx={{
                    pl: 0.6,
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'text.primary',
                    border: 'none',
                  }}
                />
              )}
              {interests.map((interest) => (
                <Chip
                  key={interest.eventCategoryId || interest.name}
                  label={interest.name}
                  size="small"
                  sx={{
                    height: 26,
                    fontSize: '0.75rem',
                    bgcolor: alpha(theme.palette.secondary.main, 0.12),
                    border: 'none',
                    color: 'text.primary',
                  }}
                />
              ))}
            </Stack>
          )}

          {/* Action */}
          <Box sx={{ mt: 'auto', pt: 3 }}>
            {!isOwnProfile ? (
              <FollowButton targetId={user.userId} targetType={FollowTargetType.User} size="small" fullWidth />
            ) : (
              <Button
                variant="outlined"
                fullWidth
                component={Link}
                href={ROUTES.USERS.USER(user.username)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                View profile
              </Button>
            )}
          </Box>
        </Box>
      </Card>
    </Grid>
  );
}
