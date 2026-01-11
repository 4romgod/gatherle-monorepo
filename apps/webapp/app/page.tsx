import Link from 'next/link';
import { JSX } from 'react';
import { auth } from '@/auth';
import { AutoAwesome, DynamicFeed, Explore, People, PersonAdd, RocketLaunch, ShieldMoon } from '@mui/icons-material';
import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import CustomContainer from '@/components/custom-container';
import EventsCarousel from '@/components/events/carousel';
import EventCategoryBox from '@/components/events/category/box';
import OrganizationCard from '@/components/organization/card';
import VenueCard from '@/components/venue/card';
import { getClient } from '@/data/graphql';
import {
  GetAllEventCategoriesDocument,
  GetAllEventsDocument,
  GetSocialFeedDocument,
  GetSocialFeedQuery,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import { RRule } from 'rrule';
import { GetAllOrganizationsDocument, GetAllVenuesDocument } from '@/data/graphql/query';
import { isAuthenticated } from '@/lib/utils';

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

// Enable ISR with 60-second revalidation for performance
export const revalidate = 60;

type OrganizationSummary = {
  orgId: string;
  slug?: string;
  name?: string;
  description?: string;
  logo?: string;
  tags?: string[];
  followersCount?: number;
  isFollowable?: boolean;
};

type OrganizationResponse = {
  readOrganizations: OrganizationSummary[] | null;
};

type VenueSummary = {
  venueId: string;
  name?: string;
  type?: string;
  capacity?: number;
  address?: {
    city?: string;
    region?: string;
    country?: string;
  };
  amenities?: string[];
};

type VenuesResponse = {
  readVenues: VenueSummary[] | null;
};

type SocialHighlight = {
  title: string;
  description: string;
  icon: JSX.Element;
};

const SOCIAL_FEED_LIMIT = 4;

const socialHighlights: SocialHighlight[] = [
  {
    title: 'Follow the people who inspire you',
    description: 'Track hosts, friends, and organizations with updates that land directly on your feed.',
    icon: <People fontSize="small" color="primary" />,
  },
  {
    title: 'Share RSVP intent with the right crowd',
    description: 'Control whether your Going or Interested signals are public or kept within your followers.',
    icon: <PersonAdd fontSize="small" color="primary" />,
  },
  {
    title: 'See the moments that matter',
    description: 'Activity cards surface RSVPs, launches, and check-ins from your circle.',
    icon: <DynamicFeed fontSize="small" color="primary" />,
  },
];

const verbLabels: Record<string, string> = {
  Followed: 'followed',
  RSVPd: "RSVP'd",
  Commented: 'commented on',
  Published: 'published',
  CreatedOrg: 'created',
  CheckedIn: 'checked in to',
  Invited: 'invited someone to',
};

const formatActivityDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getActivityObjectLabel = (activity: GetSocialFeedQuery['readFeed'][number]): string => {
  const metadata = activity.metadata as Record<string, any> | undefined;
  if (activity.objectType === 'Event' && metadata?.eventTitle) {
    return metadata.eventTitle;
  }
  if (activity.objectType === 'Organization' && metadata?.name) {
    return metadata.name;
  }
  return activity.objectType.toLowerCase();
};

const getActorLabel = (activity: GetSocialFeedQuery['readFeed'][number]): string => {
  if (activity.actorId) {
    return `User ${activity.actorId.slice(0, 6)}`;
  }
  return 'Someone';
};

export default async function HomePage() {
  const session = await auth();
  const token = session?.user?.token;
  const isAuth = await isAuthenticated(token);

  // Parallelize all independent queries for faster page load
  const [{ data: events }, { data }, orgResponse, venueResponse] = await Promise.all([
    getClient().query({ query: GetAllEventsDocument }),
    getClient().query({ query: GetAllEventCategoriesDocument }),
    getClient().query<OrganizationResponse>({ query: GetAllOrganizationsDocument }),
    getClient().query<VenuesResponse>({ query: GetAllVenuesDocument }),
  ]);

  const eventCategories = data.readEventCategories?.slice(0, 6) ?? [];
  const eventList = (events.readEvents ?? []) as EventPreview[];
  const featuredEvents = eventList.slice(0, 8);
  const heroEvent = eventList[0];
  const heroEventRsvps = heroEvent?.participants?.length ?? 0;
  const featuredOrganizations = (orgResponse.data.readOrganizations ?? []).slice(0, 3);
  const featuredVenues = (venueResponse.data.readVenues ?? []).slice(0, 3);

  const socialCtaLabel = isAuth
    ? 'View your feed'
    : token
      ? 'Refresh your session to unlock socials'
      : 'Sign in to unlock socials';
  let socialFeed: GetSocialFeedQuery['readFeed'] = [];
  if (isAuth) {
    try {
      const feedResponse = await getClient().query<GetSocialFeedQuery>({
        query: GetSocialFeedDocument,
        variables: { limit: SOCIAL_FEED_LIMIT },
        context: {
          headers: {
            token: token,
          },
        },
      });
      socialFeed = feedResponse.data.readFeed ?? [];
    } catch (error) {
      console.error('Unable to load social feed', error);
    }
  }

  const feedPlaceholderCopy = isAuth
    ? 'Follow people and join events to see this feed light up.'
    : token
      ? 'Refresh your credentials to view personalized social updates.'
      : 'Sign in to surface personalized social updates from your follow network.';

  const heroStats = [
    { label: 'Communities hosted', value: '2.4k+' },
    { label: 'Moments created', value: '18k+' },
    { label: 'Avg. RSVP uplift', value: '34%' },
  ];

  const experiencePillars = [
    {
      title: 'Designed for human energy',
      copy: 'Build gatherings that feel alive with warm sign-ups, evocative imagery, and RSVP cues that signal momentum.',
      icon: <AutoAwesome />,
    },
    {
      title: 'Trust is default',
      copy: 'Clear event anatomy, verified hosts, and reminders calibrated to keep your people close without the spam.',
      icon: <ShieldMoon />,
    },
    {
      title: 'From RSVP to revenue',
      copy: 'Track RSVPs, spot top supporters, and nudge the right guests toward tickets or membership.',
      icon: <RocketLaunch />,
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
      <Box
        id="hero-section"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 7, md: 10 },
          px: { xs: 2, md: 3 },
          backgroundColor: 'hero.background',
          color: 'hero.textSecondary',
        }}
      >
        <CustomContainer>
          <Grid container spacing={4} alignItems="center" sx={{ position: 'relative', zIndex: 2 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Chip
                label="Gather boldly, host with ease"
                color="secondary"
                variant="outlined"
                sx={{
                  mb: 3,
                  borderColor: 'hero.cardBorder',
                  color: 'hero.text',
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  backgroundColor: 'hero.cardBg',
                }}
              />
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2rem', md: '2.6rem' },
                  lineHeight: 1.1,
                  mb: 2,
                  color: 'hero.text',
                }}
              >
                Where unforgettable experiences find their people.
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 400,
                  fontSize: { xs: '1rem', md: '1.08rem' },
                  color: 'hero.textSecondary',
                  mb: 3,
                  opacity: 0.85,
                }}
              >
                Ntlango is the modern layer for community-led events—discover inspiring gatherings or host your own with
                gorgeous, human-first pages.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  component={Link}
                  href={ROUTES.EVENTS.ROOT}
                  startIcon={<Explore />}
                  sx={{ px: 2.3, py: 1 }}
                >
                  Explore events
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  component={Link}
                  href={ROUTES.ACCOUNT.EVENTS.CREATE}
                  sx={{
                    px: 2.3,
                    py: 1,
                    borderColor: 'hero.cardBorder',
                    color: 'hero.text',
                    '&:hover': { borderColor: 'hero.text', backgroundColor: 'hero.cardBg' },
                  }}
                >
                  Host with Ntlango
                </Button>
              </Box>
              <Grid container spacing={2}>
                {heroStats.map(stat => (
                  <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: 'hero.cardBg',
                        border: '1px solid',
                        borderColor: 'hero.cardBorder',
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'hero.text' }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'hero.textSecondary', opacity: 0.75 }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Paper
                sx={{
                  p: 2.1,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'hero.cardBorder',
                  backgroundColor: 'hero.cardBg',
                  color: 'hero.textSecondary',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
                }}
              >
                <Typography variant="overline" sx={{ color: 'hero.textSecondary', opacity: 0.7, letterSpacing: 1 }}>
                  Featured gathering
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'hero.text', mt: 1 }}>
                  {heroEvent?.title ?? 'Immersive night market'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'hero.textSecondary', opacity: 0.75, mt: 1.5 }}>
                  {heroEvent ? RRule.fromString(heroEvent.recurrenceRule).toText() : 'Every Friday · 7:00pm'}
                </Typography>
                <Box
                  sx={{
                    mt: 3,
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'hero.cardBorder',
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      paddingTop: '60%',
                      backgroundImage: `url(${heroEvent?.media?.featuredImageUrl || 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=1200&q=80'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    mt: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Typography variant="body1" sx={{ color: 'hero.text', fontWeight: 600 }}>
                    {heroEvent ? `${heroEventRsvps} RSVPs` : '120 RSVPs forming'}
                  </Typography>
                  {heroEvent && (
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      component={Link}
                      href={ROUTES.EVENTS.EVENT(heroEvent.slug)}
                    >
                      View details
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CustomContainer>
      </Box>

      <Box
        id="featured-events"
        sx={{
          backgroundColor: 'background.paper',
          py: { xs: 5, md: 7 },
        }}
      >
        <Container>
          <EventsCarousel
            events={featuredEvents}
            title="Upcoming Events"
            autoplay={false}
            autoplayInterval={6000}
            itemWidth={260}
            showIndicators={true}
            viewAllEventsButton={true}
          />
        </Container>
      </Box>

      <Box
        id="explore-categories"
        sx={{
          backgroundColor: 'background.default',
          py: { xs: 5, md: 7 },
        }}
      >
        <Container>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, textAlign: 'center' }}>
            Choose your kind of magic
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Discover spaces built for music lovers, builders, founders, foodies, and everyone in between.
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            {eventCategories.map((category, index) => {
              return (
                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={index}>
                  <EventCategoryBox eventCategory={category} />
                </Grid>
              );
            })}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<Explore />}
              component={Link}
              href={ROUTES.EVENTS.ROOT}
              sx={{ borderRadius: 4, px: 3 }}
            >
              Explore all categories
            </Button>
          </Box>
        </Container>
      </Box>

      <Box
        id="communities"
        sx={{
          backgroundColor: 'background.paper',
          py: { xs: 5, md: 7 },
        }}
      >
        <Container>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, textAlign: 'center' }}>
            The community behind the gatherings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5, textAlign: 'center' }}>
            Discover the organizations and venues powering the events you care about.
          </Typography>

          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Featured organizations
              </Typography>
              <Button component={Link} href={ROUTES.ORGANIZATIONS.ROOT} variant="text" size="small" color="secondary">
                View all
              </Button>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 3,
              }}
            >
              {featuredOrganizations.map(organization => (
                <Box key={organization.orgId}>
                  <OrganizationCard {...organization} />
                </Box>
              ))}
              {featuredOrganizations.length === 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    No highlighted communities yet.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Featured venues
              </Typography>
              <Button component={Link} href={ROUTES.VENUES.ROOT} variant="text" size="small" color="secondary">
                View all
              </Button>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 3,
              }}
            >
              {featuredVenues.map(venue => (
                <Box key={venue.venueId}>
                  <VenueCard {...venue} />
                </Box>
              ))}
              {featuredVenues.length === 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    No venues available at the moment.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Box
        id="social-layer"
        sx={{
          backgroundColor: 'background.default',
          py: { xs: 5, md: 7 },
          px: { xs: 1, md: 2 },
        }}
      >
        <CustomContainer>
          <Grid container spacing={6} alignItems="stretch">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                Social layer
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Follow hosts, friends, and organizations, share your intent with the right audience, and catch the
                moments your circle is creating in one place.
              </Typography>
              <Stack spacing={1}>
                {socialHighlights.map(highlight => (
                  <Paper
                    key={highlight.title}
                    variant="outlined"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.25,
                      borderRadius: 3,
                    }}
                  >
                    <Box>{highlight.icon}</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="600">
                        {highlight.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {highlight.description}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  component={Link}
                  href={isAuth ? ROUTES.EVENTS.ROOT : ROUTES.AUTH.LOGIN}
                  sx={{ borderRadius: 999 }}
                >
                  {socialCtaLabel}
                </Button>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  p: { xs: 2, md: 3 },
                  minHeight: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Activity preview
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Live updates shaped by the people you follow.
                </Typography>
                <Stack spacing={2} flexGrow={1}>
                  {isAuth && socialFeed.length > 0 ? (
                    socialFeed.map(activity => {
                      const objectLabel = getActivityObjectLabel(activity);
                      const verbLabel = verbLabels[activity.verb] ?? activity.verb;
                      const timestampLabel = formatActivityDate(activity.eventAt ?? activity.metadata?.timestamp);
                      return (
                        <Paper
                          key={activity.activityId}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            px: 2,
                            py: 1.5,
                            backgroundColor: 'background.paper',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 0.75,
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {getActorLabel(activity)}
                            </Typography>
                            <Chip size="small" label={activity.visibility} />
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {`${verbLabel} ${objectLabel}`}
                          </Typography>
                          {timestampLabel && (
                            <Typography variant="caption" color="text.secondary">
                              {timestampLabel}
                            </Typography>
                          )}
                        </Paper>
                      );
                    })
                  ) : (
                    <Box
                      sx={{
                        borderRadius: 3,
                        border: '1px dashed',
                        borderColor: 'divider',
                        p: 2,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {feedPlaceholderCopy}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </CustomContainer>
      </Box>

      <Box
        id="create-event-cta"
        sx={{
          backgroundColor: 'background.paper',
          py: { xs: 5, md: 7 },
        }}
      >
        <CustomContainer>
          <Grid container spacing={3} alignItems="center">
            {experiencePillars.map(pillar => (
              <Grid size={{ xs: 12, md: 4 }} key={pillar.title}>
                <Paper
                  sx={{
                    p: 2.25,
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    boxShadow: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: 'secondary.main',
                      color: 'secondary.contrastText',
                      mb: 2,
                    }}
                  >
                    {pillar.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                    {pillar.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pillar.copy}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CustomContainer>
      </Box>

      <Box
        sx={{
          backgroundColor: 'background.default',
          py: { xs: 5, md: 7 },
        }}
      >
        <CustomContainer>
          <Paper
            sx={{
              p: { xs: 2.25, md: 2.75 },
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                Ready to launch your next gathering?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
                Ship a beautiful event page in minutes, rally RSVPs, and keep momentum all the way to showtime.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                component={Link}
                href={ROUTES.ACCOUNT.EVENTS.CREATE}
                sx={{ borderRadius: 10 }}
              >
                Start hosting
              </Button>
              <Button variant="outlined" color="inherit" size="large" component={Link} href={ROUTES.EVENTS.ROOT}>
                See community events
              </Button>
            </Box>
          </Paper>
        </CustomContainer>
      </Box>
    </Box>
  );
}
