import { Avatar, Box, Button, Container, Card, CardContent, Divider, Stack, Typography, Grid, Paper, Chip } from '@mui/material';
import Link from 'next/link';
import { Metadata } from 'next';
import { Language, ArrowBack, Share, CalendarMonth } from '@mui/icons-material';
import { notFound } from 'next/navigation';
import { getClient } from '@/data/graphql';
import { GetAllEventsDocument } from '@/data/graphql/query/Event/query';
import { GetOrganizationBySlugDocument } from '@/data/graphql/query';
import { GetAllEventsQuery, Organization, SortOrderInput } from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import FollowStatsCard from '@/components/organization/follow-stats-card';
import EventBoxSm from '@/components/events/event-box-sm';

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

  const coverImage = organization.logo || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

  return (
    <Box>
      {/* Hero Section with Cover */}
      <Box sx={{ position: 'relative', bgcolor: 'background.default' }}>
        <Box
          sx={{
            height: { xs: 280, sm: 340, md: 380 },
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={coverImage}
            alt={organization.name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 35%',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '45%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            }}
          />
          
          {/* Back Button */}
          <Button
            component={Link}
            href={ROUTES.ORGANIZATIONS.ROOT}
            startIcon={<ArrowBack />}
            sx={{
              position: 'absolute',
              top: 24,
              left: 24,
              bgcolor: 'background.paper',
              opacity: 0.95,
              backdropFilter: 'blur(10px)',
              px: 2,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'background.paper',
                opacity: 1,
              },
            }}
          >
            Back
          </Button>

          {/* Avatar and Title */}
          <Container
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 2,
              pb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
              <Avatar
                src={organization.logo || undefined}
                alt={organization.name}
                sx={{
                  width: { xs: 80, sm: 100, md: 120 },
                  height: { xs: 80, sm: 100, md: 120 },
                  border: '4px solid',
                  borderColor: 'common.white',
                  bgcolor: 'primary.main',
                  fontSize: { xs: 32, sm: 40, md: 48 },
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                {organization.name?.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1, pb: 1 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{
                    color: 'common.white',
                    fontSize: { xs: '1.625rem', sm: '2rem', md: '2.5rem' },
                    textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                    lineHeight: 1.2,
                  }}
                >
                  {organization.name}
                </Typography>
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>

      {/* Main Content */}
      <Container sx={{ mt: -6, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3}>
          {/* Left Column - Main Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* About Card */}
            <Card
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
                  About
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2, lineHeight: 1.3 }}>
                  {organization.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                  {organization.description || 'No description provided yet.'}
                </Typography>
                
                {tags.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
                    {tags.map(tag => (
                      <Chip key={tag} label={`#${tag}`} size="small" sx={{ fontWeight: 500 }} />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Links Card */}
            {(links.length > 0 || domainsAllowed.length > 0) && (
              <Card
                elevation={0}
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Links & Domains
                  </Typography>
                  <Stack spacing={1}>
                    {links.map(link => (
                      <Button
                        key={link.url}
                        component="a"
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        startIcon={<Language />}
                        variant="outlined"
                        fullWidth
                        sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                      >
                        {link.label}
                      </Button>
                    ))}
                    {domainsAllowed.map(domain => (
                      <Chip key={domain} label={domain} variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events */}
            <Card
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  Upcoming Events
                </Typography>
                {events.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CalendarMonth sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No events published yet</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {events.map(event => (
                      <Grid size={{ xs: 12, sm: 6 }} key={event.eventId}>
                        <EventBoxSm event={event} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
              {/* Stats Card */}
              <FollowStatsCard
                orgId={organization.orgId}
                initialFollowersCount={organization.followersCount ?? 0}
              />

              {/* Share Card */}
              <Card
                elevation={0}
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Share sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                    Share this organization
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 2, fontWeight: 600, textTransform: 'none' }}
                  >
                    Copy Link
                  </Button>
                </CardContent>
              </Card>

              {/* Event Defaults Card */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={600}>
                    Event Defaults
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {[
                      { label: 'Visibility', value: organization.eventDefaults?.visibility ?? 'Public' },
                      { label: 'Reminders', value: organization.eventDefaults?.remindersEnabled ? 'On' : 'Off' },
                      { label: 'Waitlist', value: organization.eventDefaults?.waitlistEnabled ? 'Enabled' : 'Disabled' },
                      { label: 'Guest +1', value: organization.eventDefaults?.allowGuestPlusOnes ? 'Allowed' : 'Disabled' },
                    ].map(meta => (
                      <Box key={meta.label}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {meta.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {meta.value}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
