import { Avatar, Box, Button, Container, Divider, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClient } from '@/data/graphql';
import { GetAllEventsDocument } from '@/data/graphql/query/Event/query';
import { GetOrganizationBySlugDocument } from '@/data/graphql/query';
import { GetAllEventsQuery, Organization, SortOrderInput } from '@/data/graphql/types/graphql';
import EventBoxSm from '@/components/events/event-box-sm';
import { ROUTES } from '@/lib/constants';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const organizationResult = await getClient().query<{ readOrganizationBySlug: Organization }, { slug: string }>({
      query: GetOrganizationBySlugDocument,
      variables: { slug },
    });
    const organization = organizationResult.data.readOrganizationBySlug;

    if (organization) {
      return {
        title: `${organization.name} · Ntlango`,
        description: organization.description || `Discover events by ${organization.name} on Ntlango.`,
      };
    }
  } catch (error) {
    console.error('Unable to load organization metadata', error);
  }

  return {
    title: 'Organization · Ntlango',
    description: 'Discover organizations powering events on Ntlango.',
  };
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  let organization: Organization | null = null;

  try {
    const organizationResult = await getClient().query<{ readOrganizationBySlug: Organization }, { slug: string }>({
      query: GetOrganizationBySlugDocument,
      variables: { slug },
    });
    organization = organizationResult.data.readOrganizationBySlug ?? null;
  } catch (error) {
    console.error('Unable to load organization', error);
    organization = null;
  }

  if (!organization) {
    notFound();
  }

  const tags = organization.tags ?? [];
  const domainsAllowed = organization.domainsAllowed ?? [];
  const links = organization.links ?? [];

  let events: GetAllEventsQuery['readEvents'] = [];
  try {
    const eventResponse = await getClient().query<GetAllEventsQuery>({
      query: GetAllEventsDocument,
      variables: {
        options: {
          filters: [{ field: 'orgId', value: organization.orgId }],
          sort: [{ field: 'title', order: SortOrderInput.Asc }],
          pagination: { limit: 12 },
        },
      },
    });
    events = eventResponse.data.readEvents ?? [];
  } catch (error) {
    console.error('Unable to load events for organization', error);
    events = [];
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: 3,
          mb: 4,
        }}
      >
        <Avatar
          src={organization.logo || undefined}
          alt={organization.name}
          sx={{
            width: 100,
            height: 100,
            bgcolor: 'primary.main',
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          {organization.name?.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {organization.name}
          </Typography>
          <Typography color="text.secondary" variant="body1">
            {organization.description || 'No description provided yet.'}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            {tags.map(tag => (
              <Button size="small" key={tag} variant="outlined">
                #{tag}
              </Button>
            ))}
          </Stack>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Followers
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {organization.followersCount.toLocaleString()}
          </Typography>
          <Button
            variant={organization.isFollowable ? 'contained' : 'outlined'}
            sx={{ mt: 1 }}
            disabled={!organization.isFollowable}
          >
            {organization.isFollowable ? 'Follow' : 'Not followable'}
          </Button>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Links and domains
        </Typography>
        <Stack direction="row" flexWrap="wrap" spacing={1}>
          {links.map(link => (
            <Button key={link.url} component="a" href={link.url} size="small" target="_blank" rel="noreferrer">
              {link.label}
            </Button>
          ))}
          {domainsAllowed.map(domain => (
            <Button key={domain} size="small" variant="outlined">
              {domain}
            </Button>
          ))}
        </Stack>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Event defaults
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {[
            { label: 'Visibility', value: organization.eventDefaults?.visibility ?? 'Public' },
            { label: 'Reminders', value: organization.eventDefaults?.remindersEnabled ? 'On' : 'Off' },
            { label: 'Waitlist', value: organization.eventDefaults?.waitlistEnabled ? 'Enabled' : 'Disabled' },
            { label: 'Guest +1', value: organization.eventDefaults?.allowGuestPlusOnes ? 'Allowed' : 'Disabled' },
            { label: 'Ticket access', value: organization.eventDefaults?.ticketAccess ?? 'Unrestricted' },
          ].map(meta => (
            <Box
              key={meta.label}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                minHeight: 90,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {meta.label}
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {meta.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Upcoming events
        </Typography>
        {events.length === 0 ? (
          <Typography color="text.secondary">No events have been published yet.</Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {events.map(event => (
              <Box key={event.eventId}>
                <EventBoxSm event={event} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
}
