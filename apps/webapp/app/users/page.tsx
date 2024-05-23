import { getClient } from '@/data/graphql/apollo-client';
import { GetAllUsersDocument } from '@/data/graphql/types/graphql';
import { Container, Typography, Grid, Avatar, Box, Divider } from '@mui/material';
import SearchInput from '@/components/search/search-box';
import UserBox from '@/components/users/user-box';

export default async function Page() {
  const { data: usersRetrieved } = await getClient().query({
    query: GetAllUsersDocument,
  });

  const users = usersRetrieved.readUsers;

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" fontWeight="bold" align="center" paddingBottom={2}>
          All Users
        </Typography>
        <SearchInput
          itemList={users.map((user) => `${user.given_name} ${user.family_name}`)}
          sx={{
            marginBottom: 5,
            mx: 'auto',
          }}
        />
        <Divider />
        <Grid container spacing={4} style={{ marginTop: '2rem' }}>
          {users.map((user) => (
            <UserBox key={user.id} user={user} />
          ))}
        </Grid>
      </Box>
    </Container>
  );
}
