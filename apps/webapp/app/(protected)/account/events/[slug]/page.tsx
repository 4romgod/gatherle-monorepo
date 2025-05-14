import Link from 'next/link';
import { GetEventBySlugDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { Box, Typography, Grid, Avatar, CardMedia, Container, Chip, Stack } from '@mui/material';
import { getEventCategoryIcon } from '@/lib/constants';
import EventOperationsModal from '@/components/modal/event-operations';
import {RRule} from 'rrule';

export default async function Page({ params }: { params: { slug: string } }) {
  // TODO this page should be accessible only to the event organizer
  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });

  const event = eventRetrieved.readEventBySlug;

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h3" gutterBottom>
          {event.title}
          <EventOperationsModal event={event} />
        </Typography>
        <Typography variant="h5" gutterBottom>
          {event.description}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <b>Reccurrence rule</b> {RRule.fromString(event.recurrenceRule).toText()}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <b>Location:</b> {JSON.stringify(event.location)}
        </Typography>

        <Box mt={2}>
          <Typography variant="h5" gutterBottom>
            Event Categories
          </Typography>
          <Stack direction="row" spacing={1} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            {event.eventCategoryList.map((category) => {
              const IconComponent = getEventCategoryIcon(category.iconName);
              return (
                <Link key={category.eventCategoryId} href={`/events#${category.name}`} passHref>
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
            {event.organizerList.map((organizer) => (
              <Grid key={organizer.userId}>
                <Link href={`/users/${organizer.username}`} passHref>
                  <Chip
                    avatar={
                      organizer.profile_picture ? (
                        <Avatar src={organizer.profile_picture} alt={organizer.username} />
                      ) : (
                        <Avatar>{organizer.username.charAt(0).toLocaleUpperCase()}</Avatar>
                      )
                    }
                    label={organizer.username}
                  />
                </Link>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box mt={2}>
          <Typography variant="h4" gutterBottom>
            RSVPs
          </Typography>
          <Grid container spacing={2}>
            {event.rSVPList.map((rsvp) => (
              <Grid key={rsvp.userId}>
                <Link href={`/users/${rsvp.username}`} passHref>
                  <Chip
                    avatar={
                      rsvp.profile_picture ? (
                        <Avatar src={rsvp.profile_picture} alt={rsvp.username} />
                      ) : (
                        <Avatar>{rsvp.username.charAt(0).toLocaleUpperCase()}</Avatar>
                      )
                    }
                    label={rsvp.username}
                  />
                </Link>
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
              <Grid key={key}>
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
              <Grid key={key}>
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
