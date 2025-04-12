import { auth } from '@/auth';
import CustomContainer from '@/components/custom-container';
import EventBox from '@/components/events/event-box';
import { getClient } from '@/data/graphql';
import { EventCategoryType, EventType, FilterOperatorInput, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { Typography, Box, Grid, Paper } from '@mui/material';
import UserDetails from '@/components/users/user-details';
import EventCategoryChip from '@/components/events/category/chip';

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    return;
  }

  const user = session.user;

  const { data: eventsRetrieved } = await getClient().query({
    query: GetAllEventsDocument,
    variables: {
      options: {
        filters: [
          {
            field: 'organizerList.userId',
            operator: FilterOperatorInput.Eq,
            value: user.userId,
          }
        ],
      },
    },
  });
  const events = eventsRetrieved.readEvents;

  // TODO get this from user registration
  const categories = events.reduce((accum: EventCategoryType[], curr: EventType) => accum.concat(curr.eventCategoryList), []);

  return (
    <Box component="main">
      <CustomContainer>
        <Box component="div">
          <Grid container>
            <Grid item md={4} width={'100%'} p={2}>
              <UserDetails user={user} />
            </Grid>
            <Grid item md={8} width={'100%'} p={2}>
              <Paper sx={{ backgroundColor: 'secondary.main', borderRadius: '12px', p: 5 }}>
                <Typography variant="h5">Lorem</Typography>
                <Typography variant="body1">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit. Non, dolores obcaecati? Ea dolore, numquam laboriosam in eum beatae blanditiis veniam culpa aliquid consectetur repellat possimus impedit reprehenderit atque? Pariatur, maxime?
                </Typography>
              </Paper>
              <Paper elevation={3} sx={{ p: 3, mt: 3, backgroundColor: 'background.default', borderRadius: '12px' }}>
                <Typography variant="h5" gutterBottom>Interests</Typography>
                {categories.map((category, index) => (
                  <EventCategoryChip key={`${category.name}.${index}`} category={category} />
                ))}
              </Paper>

              <Box component="div" pt={5}>
                <Grid container spacing={2}>
                  {events.map((event) => {
                    return (
                      <Grid item key={`EventTileGrid.${event.eventId}`} xs={12}>
                        <Box component="div">
                          <EventBox event={event} />
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CustomContainer>
    </Box>
  );
}
