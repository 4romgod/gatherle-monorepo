import { Metadata } from 'next';
import { GetEventBySlugDocument, Location } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { Box, Typography, Grid, CardMedia, Container, Stack } from '@mui/material';
import PurchaseCard from '@/components/purchase-card';
import EventCategoryChip from '@/components/events/category/chip';
import UserChip from '@/components/users/user-chip';
import { RRule } from 'rrule';

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

export default async function Page({ params }: { params: { slug: string } }) {
  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });
  const event = eventRetrieved.readEventBySlug;

  const renderLocation = (location: Location) => {
    switch (location.locationType) {
      case 'venue':
        return (
          <Typography variant="body2" gutterBottom>
            {location.address?.street && `${location.address.street}, `}
            {location.address?.city && `${location.address.city}, `}
            {location.address?.state && `${location.address.state}, `}
            {location.address?.zipCode && `${location.address.zipCode}, `}
            {location.address?.country}
          </Typography>
        );
      case 'online':
        return (
          <Typography variant="body2" gutterBottom>
            This event will be held online.
          </Typography>
        );
      case 'tba':
        return (
          <Typography variant="body2" gutterBottom>
            The location will be announced soon.
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Container>
      <Box my={4}>
        <Box mt={2}>
          <CardMedia
            component="img"
            image={event.media?.featuredImageUrl || ''} // TODO default this image
            alt={event.title}
            sx={{
              width: '100%',
              height: { xs: 230, sm: 300, md: 350, lg: 420, xl: 470 },
              borderRadius: { xs: '9px', sm: '12px', md: '15px', xl: '20px' },
            }}
          />
        </Box>

        <Grid container spacing={5}>
          <Grid item md={9} width={'100%'} mt={2}>
            <Box component="div">
              <Typography variant="h3" gutterBottom>
                {event.title}
              </Typography>
            </Box>

            <Box component="div" mt={5}>
              <Typography variant="h5" gutterBottom>
                Date and Time
              </Typography>
              <Typography variant="body2" gutterBottom>
                {RRule.fromString(event.recurrenceRule).toText()}
              </Typography>
            </Box>

            <Box component="div" mt={5}>
              <Typography variant="h5" gutterBottom>
                Location
              </Typography>
              {renderLocation(event.location)}
            </Box>

            <Box component="div" mt={5}>
              <Typography variant="h5" gutterBottom>
                About this event
              </Typography>
              <Typography variant="body2" gutterBottom>
                {event.description}
              </Typography>
            </Box>

            <Box component="div" mt={5}>
              <Typography variant="h5" gutterBottom>
                Categories
              </Typography>
              <Stack direction="row" spacing={1} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                {(event.eventCategoryList.length > 0) ? event.eventCategoryList.map((category, index) => (
                  <EventCategoryChip key={`${category.name}.${index}`} category={category} />
                )) : (
                  <Typography variant='body2'>
                    No available categories
                  </Typography>
                )}
              </Stack>
            </Box>

            <Box component="div" mt={5}>
              <Typography variant="h5" gutterBottom>
                Organizers
              </Typography>
              <Grid container spacing={2}>
                {event.organizerList.map((organizer) => (
                  <Grid item key={organizer.userId}>
                    <UserChip user={organizer} />
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box component="div" mt={5}>
              <Typography variant="h5" gutterBottom>
                RSVPs
              </Typography>
              <Grid container spacing={2}>
                {event.rSVPList.map((rsvp) => (
                  <Grid item key={rsvp.userId}>
                    <UserChip user={rsvp} />
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box component="div" mt={5}>
              <Typography variant="h5" gutterBottom>
                Comments
              </Typography>
              {event.comments ? (
                <Grid container spacing={2}>
                  {Object.entries(event.comments).map(([key, comment]) => (
                    <Grid item key={key}>
                      <Typography variant="body2" gutterBottom>
                        {String(comment)}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant='body2'>
                  No available comments
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item md={3} width={'100%'} mt={2}>
            <PurchaseCard />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
