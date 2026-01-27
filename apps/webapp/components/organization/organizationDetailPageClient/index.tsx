'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { alpha, Avatar, Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import { ArrowBack, Language, Share } from '@mui/icons-material';
import { GetAllEventsDocument } from '@/data/graphql/query/Event/query';
import { GetOrganizationBySlugDocument } from '@/data/graphql/query';
import { GetAllEventsQuery, Organization, SortOrderInput } from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import Carousel from '@/components/carousel';
import EventBoxSm from '@/components/events/eventBoxSm';
import FollowStatsCard from '@/components/organization/FollowStatsCard';
import OrganizationPageSkeleton from '@/components/organization/organizationDetailPageClient/OrganizationDetailPageSkeleton';

interface OrganizationPageClientProps {
  slug: string;
}

const EVENT_LIMIT = 12;

export default function OrganizationPageClient({ slug }: OrganizationPageClientProps) {
  const {
    data: orgData,
    loading: orgLoading,
    error: orgError,
  } = useQuery<{ readOrganizationBySlug: Organization }>(GetOrganizationBySlugDocument, {
    variables: { slug },
    fetchPolicy: 'cache-and-network',
  });

  const organization = orgData?.readOrganizationBySlug ?? null;
  const { orgId, name, description, logo, tags, domainsAllowed, links, eventDefaults, followersCount } =
    organization ?? {};

  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
  } = useQuery<GetAllEventsQuery>(GetAllEventsDocument, {
    variables: {
      options: {
        filters: [{ field: 'orgId', value: orgId }],
        sort: [{ field: 'title', order: SortOrderInput.Asc }],
        pagination: { limit: EVENT_LIMIT },
      },
    },
    skip: !orgId,
    fetchPolicy: 'cache-and-network',
  });

  const events = eventsData?.readEvents ?? [];
  const isLoading = orgLoading || (orgId ? eventsLoading : false);
  const hasError = orgError || eventsError;

  if (isLoading) {
    return <OrganizationPageSkeleton />;
  }

  if (hasError || !organization) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="error">
          Unable to load the organization right now.
        </Typography>
      </Box>
    );
  }

  const coverImage =
    logo || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

  const eventDefaultsMeta = [
    { label: 'Visibility', value: eventDefaults?.visibility ?? 'Public' },
    { label: 'Reminders', value: eventDefaults?.remindersEnabled ? 'On' : 'Off' },
    { label: 'Waitlist', value: eventDefaults?.waitlistEnabled ? 'Enabled' : 'Disabled' },
    { label: 'Guest +1', value: eventDefaults?.allowGuestPlusOnes ? 'Allowed' : 'Disabled' },
  ];

  return (
    <Box>
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
            alt={name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 35%',
            }}
          />
          <Box
            sx={(theme) => ({
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '45%',
              background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.8)} 0%, transparent 100%)`,
            })}
          />

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
                src={logo || undefined}
                alt={name}
                sx={{
                  width: { xs: 80, sm: 100, md: 120 },
                  height: { xs: 80, sm: 100, md: 120 },
                  border: '4px solid',
                  borderColor: 'common.white',
                  bgcolor: 'primary.main',
                  fontSize: { xs: 32, sm: 40, md: 48 },
                  fontWeight: 700,
                }}
              >
                {name?.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1, pb: 1 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={(theme) => ({
                    color: 'common.white',
                    fontSize: { xs: '1.625rem', sm: '2rem', md: '2.5rem' },
                    textShadow: `0 2px 20px ${alpha(theme.palette.common.black, 0.5)}`,
                    lineHeight: 1.2,
                  })}
                >
                  {name}
                </Typography>
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>

      <Container sx={{ mt: -6, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
                  About
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2, lineHeight: 1.3 }}>
                  {name}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                  {description || 'No description provided yet.'}
                </Typography>
                {tags?.length ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
                    {tags.map((tag) => (
                      <Chip key={tag} label={`#${tag}`} size="small" sx={{ fontWeight: 500 }} />
                    ))}
                  </Stack>
                ) : null}
              </CardContent>
            </Card>

            {links?.length || domainsAllowed?.length ? (
              <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Links & Domains
                  </Typography>
                  <Stack spacing={1}>
                    {links?.map((link) => (
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
                    {domainsAllowed?.map((domain) => (
                      <Chip key={domain} label={domain} variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 4 }}>
                <Carousel items={events} title="Upcoming Events" renderItem={(event) => <EventBoxSm event={event} />} />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
              <FollowStatsCard
                orgId={organization.orgId}
                orgName={organization.name}
                initialFollowersCount={organization.followersCount ?? 0}
              />

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
                  <Button variant="contained" size="small" sx={{ mt: 2, fontWeight: 600, textTransform: 'none' }}>
                    Copy Link
                  </Button>
                </CardContent>
              </Card>

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
                    {eventDefaultsMeta.map((meta) => (
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
