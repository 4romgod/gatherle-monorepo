import EventTileGrid from '@/components/events/event-tile-grid';
import DisplayEventFilters from '@/components/events/display-event-filters';
import { groupEventsByCategory } from '@/lib/utils/data-manipulation';
import { getClient } from '@/lib/graphql/apollo-client';
import { Typography, Container, Grid, Box } from '@mui/material';
import { EventCategoryType, GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/lib/graphql/types/graphql';
import SearchInput from '@/components/search/search-box';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Ntlango',
    template: 'Ntlango',
  },
  icons: {
    icon: '/logo-img.png',
    shortcut: '/logo-img.png',
    apple: '/logo-img.png',
  },
};

export default async function Home() {
  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
  });
  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  const allCategories: EventCategoryType[] = eventCategories.readEventCategories;
  const eventsByCategory = groupEventsByCategory(events);

  return (
    <main>
      <Container>
        <Box component="div">
          <Box component="div">
            <SearchInput
              itemList={events.readEvents.map((item) => item.title)}
              sx={{
                // display: { xs: 'flex', md: 'none' },
                marginBottom: 5,
                mx: 'auto',
              }}
            />
          </Box>
        </Box>
        <Grid container spacing={3} justifyContent="space-between" className="pt-5">
          <Grid item md={3} id="event-filters" width={'100%'}>
            <DisplayEventFilters categoryList={allCategories} />
          </Grid>
          <Grid item md={9}>
            <Box component="div">
              {events.readEvents.length ? (
                <EventTileGrid eventsByCategory={eventsByCategory} />
              ) : (
                <Typography variant="h4">No Events Found</Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </main>
  );
}
