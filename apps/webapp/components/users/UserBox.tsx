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

  // Extract location from user (city + country to create richer string)
  const location = [user.location?.city, user.location?.country].filter(Boolean).join(', ');

  // Get interests (limit to 3 for display)
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
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: 'primary.main',
            boxShadow: theme.shadows[4],
          },
        }}
      >
        <Box
          sx={{
            bgcolor: 'primary.main',
            px: 2,
            py: 2,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Link href={ROUTES.USERS.USER(user.username)} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={getAvatarSrc(user)}
                alt={displayName}
                sx={{
                  width: 58,
                  height: 58,
                  border: '3px solid',
                  borderColor: 'common.white',
                  boxShadow: theme.shadows[3],
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }}
              >
                {displayName?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  lineHeight={1.2}
                  sx={{
                    color: 'primary.contrastText',
                  }}
                >
                  {displayName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'primary.contrastText',
                    opacity: 0.9,
                  }}
                >
                  @{user.username}
                </Typography>
              </Box>
            </Stack>
          </Link>

          {typeof user.followersCount === 'number' && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <People fontSize="small" sx={{ color: 'primary.contrastText' }} />
              <Typography variant="caption" fontWeight={600} color="primary.contrastText">
                {(user.followersCount || 0).toLocaleString()} {user.followersCount === 1 ? 'follower' : 'followers'}
              </Typography>
            </Stack>
          )}
        </Box>

        <Box sx={{ p: 3, pt: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {user.bio && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 48 }}>
              {user.bio}
            </Typography>
          )}

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 'auto' }}>
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
            {interests.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
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
          </Stack>

          {!isOwnProfile && (
            <Box sx={{ mt: 3 }}>
              <FollowButton targetId={user.userId} targetType={FollowTargetType.User} size="small" fullWidth />
            </Box>
          )}

          {isOwnProfile && (
            <Box sx={{ mt: 3 }}>
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
            </Box>
          )}
        </Box>
      </Card>
    </Grid>
  );
}
