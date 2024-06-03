import { getClient } from '@/data/graphql/apollo-client';
import { GetUserByUsernameDocument } from '@/data/graphql/types/graphql';
import { Person } from '@mui/icons-material';
import { Container, Typography, Avatar, Box, Divider } from '@mui/material';

export default async function ProfilePage() {
  const { data: userRetrieved } = await getClient().query({
    query: GetUserByUsernameDocument,
    variables: { username: 'jayz' }, // TODO stop hardcoding the username (get it from cookies)
  });

  const user = userRetrieved.readUserByUsername;

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" fontWeight="bold" align="center" paddingBottom={2}>
          {`${user.given_name} ${user.family_name}`}
        </Typography>
        <Divider />
        <Box display="flex" alignItems="center" marginTop={4}>
          <Avatar src={user.profile_picture || '/user-icon.png'} alt={user.username} sx={{ width: 100, height: 100 }}>
            <Person sx={{ width: 60, height: 60 }} />
          </Avatar>
          <Box marginLeft={4}>
            <Typography variant="body1">
              <b>First Name:</b> {user.given_name}
            </Typography>
            <Typography variant="body1">
              <b>Second Name:</b> {user.family_name}
            </Typography>
            <Typography variant="body1">
              <b>Email:</b> {user.email}
            </Typography>
            <Typography variant="body1">
              <b>Gender:</b> {user.gender}
            </Typography>
            <Typography variant="body1">
              <b>Birthdate:</b> {user.birthdate}
            </Typography>
            <Typography variant="body1">
              <b>Address:</b> {user.address}
            </Typography>
            <Typography variant="body1">
              <b>User Type:</b> {user.userRole}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
