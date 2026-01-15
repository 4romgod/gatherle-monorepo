'use client';

import { Typography, Grid, Avatar, Box, Stack, Chip } from '@mui/material';
import { Person, LocationOn, People } from '@mui/icons-material';
import { User, FollowTargetType } from '@/data/graphql/types/graphql';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { getAvatarSrc, getDisplayName } from '@/lib/utils';
import FollowButton from './follow-button';
import { useSession } from 'next-auth/react';

interface UserBoxProps {
  user: User;
}

export default function UserBox({ user }: UserBoxProps) {
  const { data: session } = useSession();
  const displayName = getDisplayName(user) !== 'Account' ? getDisplayName(user) : user.username;
  const isOwnProfile = session?.user?.userId === user.userId;
  
  // Extract location from address if available
  const location = user.address?.address?.city || user.address?.address?.country;
  
  // Get interests (limit to 3 for display)
  const interests = user.interests?.slice(0, 3) || [];
  
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
      <Box
        sx={{
          height: '100%',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'border-color 0.2s ease',
          '&:hover': {
            borderColor: 'text.secondary',
          },
        }}
      >
        {/* Header Banner - Subtle gradient */}
        <Box
          sx={{
            height: 48,
            bgcolor: 'action.hover',
            position: 'relative',
          }}
        />

        {/* Main Content */}
        <Box sx={{ px: 2.5, pb: 2.5, mt: -4 }}>
          {/* Avatar */}
          <Link href={ROUTES.USERS.USER(user.username)} style={{ textDecoration: 'none' }}>
            <Avatar
              src={getAvatarSrc(user)}
              alt={displayName}
              sx={{
                width: 64,
                height: 64,
                border: '3px solid',
                borderColor: 'background.paper',
                bgcolor: 'background.default',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Person sx={{ fontSize: 32, color: 'text.secondary' }} />
            </Avatar>
          </Link>

          {/* Name & Username */}
          <Box sx={{ mt: 1.5 }}>
            <Link href={ROUTES.USERS.USER(user.username)} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                {displayName}
              </Typography>
            </Link>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              @{user.username}
            </Typography>
          </Box>

          {/* Bio */}
          {user.bio && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.5,
                minHeight: 42,
              }}
            >
              {user.bio}
            </Typography>
          )}

          {/* Meta Info Row */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              mt: 2,
              color: 'text.secondary',
            }}
          >
            {/* Location */}
            {location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn sx={{ fontSize: 16 }} />
                <Typography variant="caption" noWrap sx={{ maxWidth: 80 }}>
                  {location}
                </Typography>
              </Box>
            )}

            {/* Followers Count */}
            {typeof user.followersCount === 'number' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <People sx={{ fontSize: 16 }} />
                <Typography variant="caption">
                  {user.followersCount} {user.followersCount === 1 ? 'follower' : 'followers'}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* Interests Tags */}
          {interests.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.5 }}>
              {interests.map(interest => (
                <Chip
                  key={interest.eventCategoryId || interest.name}
                  label={interest.name}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: 'action.selected',
                    border: 'none',
                    '& .MuiChip-label': {
                      px: 1,
                    },
                  }}
                />
              ))}
            </Stack>
          )}

          {/* Follow Button - Only show for other users */}
          {!isOwnProfile && (
            <Box sx={{ mt: 2 }}>
              <FollowButton
                targetId={user.userId}
                targetType={FollowTargetType.User}
                size="small"
                fullWidth
              />
            </Box>
          )}
        </Box>
      </Box>
    </Grid>
  );
}
