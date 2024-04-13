import EventTileGrid from '@/components/events/event-tile-grid';
import Footer from '@/components/footer';
import Navbar from '@/components/navigation/navbar';
import { groupEventsByCategory } from '@/lib/utils/dataManipulation';
import { getClient } from '@/lib/graphql/apollo-client';
import { Typography, Container, Grid, Box } from '@mui/material';
import DisplayCategoryList from '@/components/display-category-list';
import {
  EventCategory,
  GetAllEventCategoriesDocument,
  GetAllEventsDocument,
} from '@/lib/graphql/types/graphql';

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
      <Navbar />
      <Container>
        <Box component="div">
          <Typography variant="h1">
            Discover Your Next Adventure - Explore Exciting Events Worldwide
          </Typography>
          <Typography className="p">
            Welcome to our vibrant community of event enthusiasts! Whether
            you&apos;re seeking cultural experiences, thrilling adventures, or
            professional networking opportunities, our platform connects you
            with the events that spark your curiosity and ignite your
            imagination. Join us today and embark on a journey of discovery
          </Typography>
        </Box>
        <Grid container spacing={12} justifyContent="space-between">
          <DisplayCategoryList categoryList={allCategories} />
          <Grid item lg={8}>
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
      <Footer />
    </>
  );
}
