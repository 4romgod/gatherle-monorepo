import { GetEventBySlugDocument } from '@/lib/graphql/types/graphql';
import { getClient } from '@/lib/graphql/apollo-client';
import { Box, Typography, Grid, Avatar, CardMedia, Container, Chip, Stack } from '@mui/material';
import { getEventCategoryIcon } from '@/lib/constants';
import Link from 'next/link';

export default async function Page({ params }: { params: { slug: string } }) {
  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });

  const event = eventRetrieved.readEventBySlug;

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h2" gutterBottom>
          {event.title}
        </Typography>
        <Typography variant="h5" gutterBottom>
          {event.description}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <b>Start Date:</b> {event.startDate}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <b>End Date:</b> {event.endDate}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <b>Location:</b> {event.location}
        </Typography>

        <Box mt={2}>
          <Typography variant="h5" gutterBottom>
            Event Categories
          </Typography>
          <Stack direction="row" spacing={1} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            {event.eventCategory.map((category) => {
              const IconComponent = getEventCategoryIcon(category.iconName);
              return (
                <Link key={category.id} href={`/events#${category.name}`} passHref>
                  <Chip
                    avatar={
                      <Avatar>
                        <IconComponent color={category.color ?? 'black'} />
                      </Avatar>
                    }
                    label={category.name}
                    variant="outlined"
                    color="secondary"
                    size="medium"
                    clickable
                  />
                </Link>
              );
            })}
          </Stack>
        </Box>

        {event.media?.featuredImageUrl && (
          <Box mt={2}>
            <CardMedia
              component="img"
              sx={{ width: '100%', height: 'auto' }}
              image={event.media.featuredImageUrl}
              alt={event.title}
            />
          </Box>
        )}

        <Box mt={2}>
          <Typography variant="h4" gutterBottom>
            Organizers
          </Typography>
          <Grid container spacing={2}>
            {event.organizers.map((organizer) => (
              <Grid item key={organizer.id}>
                {organizer.profile_picture ? (
                  <Avatar src={organizer.profile_picture} alt={organizer.username} />
                ) : (
                  <Chip
                    avatar={<Avatar>{organizer.username.charAt(0).toLocaleUpperCase()}</Avatar>}
                    label={organizer.username}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box mt={2}>
          <Typography variant="h4" gutterBottom>
            RSVPs
          </Typography>
          <Grid container spacing={2}>
            {event.rSVPs.map((rsvp) => (
              <Grid item key={rsvp.id}>
                {rsvp.profile_picture ? (
                  <Avatar src={rsvp.profile_picture} alt={rsvp.username} />
                ) : (
                  <Chip avatar={<Avatar>{rsvp.username.charAt(0).toLocaleUpperCase()}</Avatar>} label={rsvp.username} />
                )}
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box mt={2}>
          <Typography variant="h4" gutterBottom>
            Tags
          </Typography>
          <Grid container spacing={1}>
            {Object.entries(event.tags).map(([key, value]) => (
              <Grid item key={key}>
                <Chip label={`${key}: ${value}`} size="small" />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box mt={2}>
          <Typography variant="h4" gutterBottom>
            Comments
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(event.comments).map(([key, comment]) => (
              <Grid item key={key}>
                <Typography variant="body2" gutterBottom>
                  {String(comment)}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}
