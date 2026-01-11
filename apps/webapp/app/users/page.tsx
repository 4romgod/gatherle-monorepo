import { getClient } from '@/data/graphql';
import { GetAllUsersDocument } from '@/data/graphql/types/graphql';
import { Typography, Grid, Box, Paper } from '@mui/material';
import { Diversity3, People } from '@mui/icons-material';
import type { Metadata } from 'next';
import SearchInput from '@/components/search/search-box';
import UserBox from '@/components/users/user-box';
import CustomContainer from '@/components/custom-container';
import HeroSection from '@/components/users/hero-section';

export const metadata: Metadata = {
  title: 'Community · Ntlango',
  description: 'Discover and connect with people in your community who share your interests.',
};

export const revalidate = 120;

export default async function Page() {
  const { data: usersRetrieved } = await getClient().query({ query: GetAllUsersDocument });

  const users = usersRetrieved.readUsers;
  const activeUsers = users.filter(u => u.username);

  return (
    <Box>
      {/* Hero Section */}
      <HeroSection totalUsers={users.length} activeUsers={activeUsers.length} />

      {/* Content Section */}
      <CustomContainer>
        <Box mb={8}>
          {/* Section Header */}
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

          {/* Search */}
          <Box mb={5}>
            <SearchInput
              itemList={users
                .map(user => {
                  const name = [user.given_name, user.family_name]
                    .filter(n => n && typeof n === 'string')
                    .join(' ');
                  return name || user.username;
                })
                .filter(Boolean)}
              sx={{
                maxWidth: '600px',
                mx: 'auto',
              }}
            />
          </Box>

          {/* User Grid */}
          <Grid container spacing={3}>
            {users.map(user => (
              <UserBox key={user.userId} user={user} />
            ))}
          </Grid>

          {/* Empty State */}
          {users.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 8,
                textAlign: 'center',
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
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
        </Box>
      </CustomContainer>
    </Box>
  );
}
