'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GetAllUsersDocument } from '@/data/graphql/types/graphql';
import { Typography, Grid, Box, Paper } from '@mui/material';
import { Diversity3, People } from '@mui/icons-material';
import SearchBox from '@/components/search/SearchBox';
import UserBox from '@/components/users/UserBox';
import UserBoxSkeleton from '@/components/users/UserBoxSkeleton';
import CustomContainer from '@/components/core/layout/CustomContainer';
import HeroSection from '@/components/users/HeroSection';

const SKELETON_COUNT = 8;

export default function UsersPageClient() {
  const { data, loading, error } = useQuery(GetAllUsersDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const users = data?.readUsers ?? [];
  const activeUsers = useMemo(() => users.filter((u) => !!u.username).length, [users]);

  const searchItems = useMemo(
    () =>
      users
        .map((user) => {
          const name = [user.given_name, user.family_name].filter((n) => n && typeof n === 'string').join(' ');
          return name || user.username;
        })
        .filter(Boolean) as string[],
    [users],
  );

  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
        Unable to load community members right now.
      </Typography>
    );
  }

  return (
    <>
      <HeroSection totalUsers={users.length} activeUsers={activeUsers} />

      <CustomContainer>
        <Box mb={8}>
          <Box mb={4}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Diversity3 sx={{ color: 'primary.main' }} />
              <Typography variant="overline" color="text.secondary" fontWeight="bold">
                Browse Community
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Meet Your People
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth="700px">
              From event enthusiasts to organizers, find people who share your vibe and interests.
            </Typography>
          </Box>

          <Box mb={5}>
            <SearchBox
              itemList={searchItems}
              sx={{
                maxWidth: '600px',
                mx: 'auto',
              }}
            />
          </Box>

          {loading && users.length === 0 ? (
            <Grid container spacing={3}>
              {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                <UserBoxSkeleton key={`user-skeleton-${index}`} />
              ))}
            </Grid>
          ) : (
            <>
              <Grid container spacing={3}>
                {users.map((user) => (
                  <UserBox key={user.userId} user={user} />
                ))}
              </Grid>

              {users.length === 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 8,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    mt: 4,
                  }}
                >
                  <People sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No users found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Be the first to join the community!
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </Box>
      </CustomContainer>
    </>
  );
}
