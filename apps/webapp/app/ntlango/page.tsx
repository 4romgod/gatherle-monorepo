import EventTileGrid from '@/components/events/event-tile-grid';
import DisplayEventFilters from '@/components/events/display-event-filters';
import { groupEventsByCategory } from '@/lib/utils/dataManipulation';
import { getClient } from '@/lib/graphql/apollo-client';
import { Typography, Container, Grid, Box } from '@mui/material';
import {
  EventCategory,
  GetAllEventCategoriesDocument,
  GetAllEventsDocument,
} from '@/lib/graphql/types/graphql';
import SearchInput from '@/components/search/search-box';

export default async function Home() {
  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
  });
  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  const allCategories: EventCategory[] = eventCategories.readEventCategories;
  const eventsByCategory = groupEventsByCategory(events);

  return (
    <>
      <Container>
        <Box component="div">
          <Box component="div">
            <SearchInput
              sx={{
                display: { xs: 'flex', md: 'none' },
                marginBottom: 5,
                mx: 'auto',
              }}
            />
          </Box>
          <Box component="div">
            <Typography
              variant="h4"
              fontWeight="bold"
              align="center"
              paddingBottom={2}
            >
              Discover Your Next Adventure
            </Typography>
            <Typography className="p" align="center">
              Welcome to our vibrant community of event enthusiasts! Whether
              you&apos;re seeking cultural experiences, thrilling adventures, or
              professional networking opportunities, our platform connects you
              with the events that spark your curiosity and ignite your
              imagination. Join us today and embark on a journey of discovery
            </Typography>
          </Box>
        </Box>
        <Grid
          container
          spacing={3}
          justifyContent="space-between"
          className="pt-5"
        >
          <Grid item md={3} id="event-filters" width={'100%'}>
            <DisplayEventFilters categoryList={allCategories} />
          </Grid>
          <Grid item md={9}>
            <Box component="div">
              {events?.readEvents?.length ? (
                <EventTileGrid eventsByCategory={eventsByCategory} />
              ) : (
                <Typography variant="h4">No Events Found</Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
