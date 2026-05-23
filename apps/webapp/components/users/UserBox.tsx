'use client';

import { Typography, Grid, Avatar, Box, Stack, Button, Card } from '@mui/material';
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

  const location = [user.location?.city, user.location?.state, user.location?.country].filter(Boolean).join(', ');
  const bioLine = user.bio || location || 'Gatherle community member';

  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'translateY(-2px)',
          },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.75 }}>
          <Link href={ROUTES.USERS.USER(user.username)} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Avatar
              src={getAvatarSrc(user)}
              alt={displayName}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                border: '2px solid',
                borderColor: 'divider',
                color: 'primary.main',
                fontWeight: 900,
                height: 58,
                width: 58,
              }}
            >
              {displayName?.[0]?.toUpperCase()}
            </Avatar>
          </Link>

          <Box
            component={Link}
            href={ROUTES.USERS.USER(user.username)}
            sx={{ color: 'inherit', flex: 1, minWidth: 0, textDecoration: 'none' }}
          >
            <Typography color="text.primary" fontWeight={800} lineHeight={1.2} noWrap variant="subtitle1">
              {displayName}
            </Typography>
            <Typography color="primary.main" fontWeight={700} noWrap variant="caption">
              @{user.username}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                overflow: 'hidden',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
              }}
              variant="body2"
            >
              {bioLine}
            </Typography>
          </Box>

          <Box sx={{ flexShrink: 0 }}>
            {!isOwnProfile ? (
              <FollowButton targetId={user.userId} targetType={FollowTargetType.User} size="small" />
            ) : (
              <Button
                variant="outlined"
                component={Link}
                href={ROUTES.USERS.USER(user.username)}
                sx={{
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 800,
                }}
              >
                Profile
              </Button>
            )}
          </Box>
        </Stack>
      </Card>
    </Grid>
  );
}
