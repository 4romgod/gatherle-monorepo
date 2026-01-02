import CustomContainer from '@/components/custom-container';
import { getClient } from '@/data/graphql';
import {
  FilterOperatorInput,
  GetAllEventsDocument,
  GetUserByUsernameDocument,
  EventOrganizerRole,
} from '@/data/graphql/types/graphql';
import { Box, Grid } from '@mui/material';
import UserDetails from '@/components/users/user-details';
import UserEventsSection from '@/components/users/user-events-section';
import { auth } from '@/auth';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserPage(props: Props) {
  const params = await props.params;
  const session = await auth();

  const { data: userRetrieved } = await getClient().query({
    query: GetUserByUsernameDocument,
    variables: { username: params.username },
  });
  const user = userRetrieved.readUserByUsername;

  // Fetch events where user is an organizer
  const { data: organizerEventsData } = await getClient().query({
    query: GetAllEventsDocument,
    variables: {
      options: {
        filters: [
          {
            field: 'organizers.user.userId',
            operator: FilterOperatorInput.Eq,
            value: user.userId,
          },
        ],
      },
    },
  });

  // Fetch events where user is a participant
  const { data: participantEventsData } = await getClient().query({
    query: GetAllEventsDocument,
    variables: {
      options: {
        filters: [
          {
            field: 'participants.userId',
            operator: FilterOperatorInput.Eq,
            value: user.userId,
          },
        ],
      },
    },
  });

  const organizerEvents = organizerEventsData.readEvents ?? [];
  const participantEvents = participantEventsData.readEvents ?? [];

  // Check if the viewing user is the profile owner
  const isOwnProfile = session?.user?.username === user.username;

  // Categorize events by role
  const hostingEvents = organizerEvents
    .filter((event) => 
      event.organizers.some(
        (org) => org.user && org.user.userId === user.userId && org.role === EventOrganizerRole.Host
      )
    )
    .map((event) => ({ ...event, userRole: 'Host' as const }));

  const coHostingEvents = organizerEvents
    .filter((event) => 
      event.organizers.some(
        (org) => org.user && org.user.userId === user.userId && org.role === EventOrganizerRole.CoHost
      )
    )
    .map((event) => ({ ...event, userRole: 'CoHost' as const }));

  // Filter out events where user is already an organizer
  const attendingEvents = participantEvents
    .filter((event) => 
      !event.organizers.some((org) => org.user && org.user.userId === user.userId)
    )
    .map((event) => {
      const participation = event.participants?.find((p) => p.userId === user.userId);
      return {
        ...event,
        userRole: 'Participant' as const,
        participantStatus: participation?.status,
        quantity: participation?.quantity ?? undefined, // Convert null to undefined
      };
    });

  return (
    <Box component="main">
      <CustomContainer>
        <Box component="div">
          <Grid container>
            <Grid size={{ md: 4 }} width={'100%'} p={2}>
              <UserDetails user={user} isOwnProfile={isOwnProfile} />
            </Grid>
            <Grid size={{ md: 8 }} width={'100%'} p={2}>
              <UserEventsSection
                title="Hosting"
                events={hostingEvents}
                emptyMessage={`${user.given_name} is not hosting any events.`}
              />
              
              <UserEventsSection
                title="Co-Hosting"
                events={coHostingEvents}
                emptyMessage={`${user.given_name} is not co-hosting any events.`}
              />
              
              <UserEventsSection
                title="Attending"
                events={attendingEvents}
                emptyMessage={`${user.given_name} is not attending any events.`}
              />
            </Grid>
          </Grid>
        </Box>
      </CustomContainer>
    </Box>
  );
}
