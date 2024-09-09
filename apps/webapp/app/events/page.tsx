import { Metadata } from 'next';
import EventTileGrid from '@/components/events/event-tile-grid';
import { groupEventsByCategory } from '@/lib/utils/data-manipulation';
import { getClient } from '@/data/graphql';
import { Typography, Grid, Box, Paper } from '@mui/material';
import { EventCategoryType, GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import SearchInput from '@/components/search/search-box';
import DesktopEventFilters from '@/components/events/filters/desktop/display-desktop-filters';
import MobileEventFilters from '@/components/events/filters/mobile/display-mobile-filters';
import CustomContainer from '@/components/custom-container';

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
    <Box component="main">
      <CustomContainer>
        <Box component="div">
          <Box component="div">
            <SearchInput
              itemList={events.readEvents.map((item) => item.title)}
              sx={{
                marginBottom: 5,
                mx: 'auto',
              }}
            />
          </Box>
        </Box>

        <Box component="div">
          <Grid container mt={10}>
            <Grid item md={4} id="event-filters" width={'100%'} p={2}>
              <DesktopEventFilters categoryList={allCategories} />
            </Grid>
            <Grid item md={8} p={2} id="events">
              <Paper sx={{ backgroundColor: 'background.default', p: 2 }}>
                {events.readEvents.length ? (
                  <EventTileGrid eventsByCategory={eventsByCategory} />
                ) : (
                  <Typography variant="h4">No Events Found</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
          <MobileEventFilters categoryList={allCategories} />
        </Box>
      </CustomContainer>
    </Box>
  );
}
