'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GetAllUsersDocument } from '@/data/graphql/types/graphql';
import { Typography, Grid, Box, Paper, Container } from '@mui/material';
import { People } from '@mui/icons-material';
import SearchBox from '@/components/search/SearchBox';
import UserBox from '@/components/users/UserBox';
import UserBoxSkeleton from '@/components/users/UserBoxSkeleton';

const SKELETON_COUNT = 8;

export default function UsersPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, loading, error } = useQuery(GetAllUsersDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const users = data?.readUsers ?? [];

  const searchItems = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((user) => {
              const name = [user.given_name, user.family_name].filter((n) => n && typeof n === 'string').join(' ');
              return name || user.username;
            })
            .filter(Boolean) as string[],
        ),
      ),
    [users],
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter((user) => {
      const name = [user.given_name, user.family_name].filter(Boolean).join(' ').toLowerCase();
      const username = (user.username ?? '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [users, searchQuery]);

  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
        Unable to load community members right now.
      </Typography>
    );
  }

  return (
    <Container maxWidth="md">
      <Box mb={8} mt={4}>
        <Box mb={5}>
          <SearchBox
            itemList={searchItems}
            placeholder="Try a name or username"
            ariaLabel="Search community members"
            onSearch={setSearchQuery}
          />
        </Box>

        {loading && users.length === 0 ? (
          <Grid container spacing={3}>
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <UserBoxSkeleton key={`user-skeleton-${index}`} />
            ))}
          </Grid>
        ) : filteredUsers.length === 0 ? (
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
              {searchQuery ? 'No matching members' : 'No users found'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try a different search term.' : 'Be the first to join the community!'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredUsers.map((user) => (
              <UserBox key={user.userId} user={user} />
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}
