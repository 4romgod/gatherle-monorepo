import EventBoxDesktop from '@/components/events/event-box/desktop';
import EventBoxMobile from '@/components/events/event-box/mobile';
import { getClient } from '@/data/graphql/apollo-client';
import { GetAllEventsDocument, GetUserByUsernameDocument } from '@/data/graphql/types/graphql';
import { Person } from '@mui/icons-material';
import { Container, Typography, Avatar, Box, Divider, Grid } from '@mui/material';

export default async function UserPage({ params }: { params: { username: string } }) {
  const { data: userRetrieved } = await getClient().query({
    query: GetUserByUsernameDocument,
    variables: { username: params.username },
  });
  const user = userRetrieved.readUserByUsername;

  const { data: eventsRetrieved } = await getClient().query({
    query: GetAllEventsDocument,
    variables: { queryParams: { organizers: [user.id] } },
  });

  const events = eventsRetrieved.readEvents;

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h3" fontWeight="bold" align="center" paddingBottom={2}>
          {`${user.given_name} ${user.family_name}`}
        </Typography>
        <Divider />
        <Box display="flex" alignItems="center" justifyContent={'center'} marginTop={4}>
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
        <Box marginTop={9}>
          <Typography variant="h4" fontWeight="bold" align="center" paddingBottom={2}>
            Organized Events
          </Typography>
          <Grid container spacing={5}>
            {events.map((event) => {
              return (
                <Grid item key={`EventTileGrid..${event.id}`} xs={12} sm={6}>
                  <Box component="div" sx={{ display: { md: 'none' } }}>
                    <EventBoxMobile event={event} />
                  </Box>
                  <Box component="div" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <EventBoxDesktop event={event} />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}
