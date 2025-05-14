import { Metadata } from 'next';
import { GetEventBySlugDocument, Location } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { Box, Typography, Grid, CardMedia, Container, Stack, Avatar } from '@mui/material';
import PurchaseCard from '@/components/purchase-card';
import EventCategoryChip from '@/components/events/category/chip';
import { RRule } from 'rrule';
import { upperFirst } from 'lodash';
import { CalendarToday, Place } from '@mui/icons-material';

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
  const { title, organizerList, description, media, recurrenceRule, location, eventCategoryList, rSVPList, comments } = eventRetrieved.readEventBySlug;

  const getLocationText = (location: Location): string => {
    switch (location.locationType) {
      case 'venue':
        const parts = [
          location.address?.street,
          location.address?.city,
          location.address?.state,
          location.address?.zipCode,
          location.address?.country,
        ].filter(Boolean);
        return parts.join(', ');
      case 'online':
        return 'This event will be held online.';
      case 'tba':
        return 'The location will be announced soon.';
      default:
        return '';
    }
  };

  return (
    <Container>
      <Box my={4}>
        <Box mt={2}>
          <CardMedia
            component="img"
            image={media?.featuredImageUrl || ''} // TODO default this image
            alt={title}
            sx={{
              width: '100%',
              height: { xs: 230, sm: 300, md: 350, lg: 420, xl: 470 },
              borderRadius: { xs: '9px', sm: '12px', md: '15px', xl: '20px' },
            }}
          />
        </Box>

        <Grid container spacing={5}>
          <Grid size={{md: 9}} width={'100%'} mt={2}>
            <Box component="div">
              <Typography fontWeight='bold' variant="h3" gutterBottom>
                {title}
              </Typography>
            </Box>

            <Box component="div" mt={8}>
              <Typography variant="h5" gutterBottom>
                Date and Time
              </Typography>
              <Typography fontWeight='bold' variant="body2" gutterBottom>
                <CalendarToday sx={{ mr: 1 }} />
                {upperFirst(RRule.fromString(recurrenceRule).toText())}
              </Typography>
            </Box>

            <Box component="div" mt={8}>
              <Typography variant="h5" gutterBottom>
                Location
              </Typography>
              <Typography fontWeight='bold' variant="body2" gutterBottom>
                <Place sx={{ mr: 1 }} />
                {getLocationText(location)}
              </Typography>
            </Box>

            <Box component="div" mt={8}>
              <Typography variant="h5" gutterBottom>
                About this event
              </Typography>
              <Typography variant="body2" gutterBottom>
                {description}
              </Typography>
            </Box>

            <Box component="section" mt={8}>
              <Typography variant="h5" gutterBottom>
                Organized By
              </Typography>

              {organizerList.length === 0 ? (
                <Typography color="text.secondary">No organizers listed.</Typography>
              ) : (
                <Grid container spacing={5}>
                  {organizerList.map((organizer) => (
                    <Grid key={organizer.userId}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          src={organizer.profile_picture || undefined}
                          alt={`${organizer.given_name} ${organizer.family_name}`}
                          sx={{ width: 64, height: 64 }}
                        />
                        <Box>
                          <Typography variant="h6">
                            {organizer.given_name} {organizer.family_name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {`Email: ${organizer.email}`}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>

            <Box component="div" mt={8}>
              <Typography variant="h5" gutterBottom>
                Categories
              </Typography>
              <Stack direction="row" spacing={1} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                {(eventCategoryList.length > 0) ? eventCategoryList.map((category, index) => (
                  <EventCategoryChip key={`${category.name}.${index}`} category={category} />
                )) : (
                  <Typography variant='body2'>
                    No available categories
                  </Typography>
                )}
              </Stack>
            </Box>

            <Box component="div" mt={8}>
              <Typography variant="h5" gutterBottom>
                Comments
              </Typography>
              {comments ? (
                <Grid container spacing={2}>
                  {Object.entries(comments).map(([key, comment]) => (
                    <Grid key={key}>
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
          <Grid size={{md: 3}} width={'100%'} mt={2}>
            <PurchaseCard />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
