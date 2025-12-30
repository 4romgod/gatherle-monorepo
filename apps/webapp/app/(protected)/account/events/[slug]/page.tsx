import Link from 'next/link';
import { GetEventBySlugDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { Box, Typography, Grid, Avatar, CardMedia, Container, Chip, Stack } from '@mui/material';
import { getEventCategoryIcon } from '@/lib/constants';
import EventOperationsModal from '@/components/modal/event-operations';
import { RRule } from 'rrule';
import { ParticipantStatus } from '@/data/graphql/types/graphql';

import { EventDetail } from '@/data/graphql/query/Event/types';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page(props: Props) {
  const params = await props.params;

  // TODO this page should be accessible only to the event organizer
  const { data: eventRetrieved } = await getClient().query({
    query: GetEventBySlugDocument,
    variables: { slug: params.slug },
  });

  const event = eventRetrieved.readEventBySlug as EventDetail;
  const tags = event.tags ?? {};
  const comments = event.comments ?? {};
  const participants = event.participants ?? [];

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
            {event.eventCategoryList.map(category => {
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
          <Grid container spacing={3}>
            {event.organizers.map(organizer => (
              <Grid key={organizer.userId}>
                {organizer.user ? (
                  <Link href={`/users/${organizer.user.username}`} passHref style={{ textDecoration: 'none' }}>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                    >
                      <Avatar
                        src={organizer.user.profile_picture || undefined}
                        alt={`${organizer.user.given_name || organizer.user.username}`}
                        sx={{ width: 56, height: 56 }}
                      >
                        {!organizer.user.profile_picture &&
                          (
                            organizer.user.given_name?.charAt(0) ||
                            organizer.user.username?.charAt(0) ||
                            '?'
                          ).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {organizer.user.given_name && organizer.user.family_name
                            ? `${organizer.user.given_name} ${organizer.user.family_name}`
                            : organizer.user.username || 'Unknown User'}
                        </Typography>
                        <Chip label={organizer.role} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
                      </Box>
                    </Stack>
                  </Link>
                ) : (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'grey.400' }}>?</Avatar>
                    <Box>
                      <Typography variant="subtitle1" color="text.secondary">
                        User ID: {organizer.userId}
                      </Typography>
                      <Chip label={organizer.role} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                  </Stack>
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
            {participants.map(participant => (
              <Grid key={participant.participantId}>
                <Chip
                  avatar={<Avatar>{participant.userId.charAt(0).toLocaleUpperCase()}</Avatar>}
                  label={`${participant.userId} (${participant.status ?? ParticipantStatus.Going})`}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box mt={2}>
          <Typography variant="h4" gutterBottom>
            Tags
          </Typography>
          <Grid container spacing={1}>
            {Object.entries(tags).map(([key, value]) => (
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
            {Object.entries(comments).map(([key, comment]) => (
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
