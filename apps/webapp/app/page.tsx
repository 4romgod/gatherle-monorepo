import Link from 'next/link';
import { JSX } from 'react';
import { auth } from '@/auth';
import { AutoAwesome, DynamicFeed, Explore, People, PersonAdd, RocketLaunch, ShieldMoon, Event as EventIcon, Person, Business } from '@mui/icons-material';
import { Avatar, Box, Button, Card, Chip, Container, Grid, Stack, Typography } from '@mui/material';
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
import { 
  ROUTES, 
  CARD_STYLES, 
  BUTTON_STYLES, 
  BUTTON_PRIMARY_STYLES,
  SECTION_TITLE_STYLES,
  SPACING,
} from '@/lib/constants';
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
  RSVPd: "RSVP'd to",
  Commented: 'commented on',
  Published: 'published',
  CreatedOrg: 'created',
  CheckedIn: 'checked in to',
  Invited: 'invited someone to',
};

const formatActivityDate = (value?: string | Date | null): string | null => {
  if (!value) {
    return null;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

type FeedActivity = GetSocialFeedQuery['readFeed'][number];

const getActorDisplayName = (activity: FeedActivity): string => {
  if (activity.actor) {
    const { given_name, family_name, username } = activity.actor;
    if (given_name || family_name) {
      return [given_name, family_name].filter(Boolean).join(' ');
    }
    return username || 'Someone';
  }
  return 'Someone';
};

const getObjectLabel = (activity: FeedActivity): string => {
  if (activity.objectType === 'Event' && activity.objectEvent) {
    return activity.objectEvent.title || 'an event';
  }
  if (activity.objectType === 'User' && activity.objectUser) {
    const { given_name, family_name, username } = activity.objectUser;
    if (given_name || family_name) {
      return [given_name, family_name].filter(Boolean).join(' ');
    }
    return `@${username}` || 'a user';
  }
  if (activity.objectType === 'Organization' && activity.objectOrganization) {
    return activity.objectOrganization.name || 'an organization';
  }
  return activity.objectType?.toLowerCase() || 'something';
};

const getObjectLink = (activity: FeedActivity): string | null => {
  if (activity.objectType === 'Event' && activity.objectEvent?.slug) {
    return ROUTES.EVENTS.EVENT(activity.objectEvent.slug);
  }
  if (activity.objectType === 'User' && activity.objectUser?.username) {
    return ROUTES.USERS.USER(activity.objectUser.username);
  }
  if (activity.objectType === 'Organization' && activity.objectOrganization?.slug) {
    return ROUTES.ORGANIZATIONS.ORG(activity.objectOrganization.slug);
  }
  return null;
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
                  sx={{ ...BUTTON_PRIMARY_STYLES }}
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
                    ...BUTTON_STYLES,
                    px: 4,
                    py: 1.5,
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
              <Card
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 3,
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
                      sx={BUTTON_STYLES}
                    >
                      View details
                    </Button>
                  )}
                </Box>
              </Card>
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
          <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, mb: 1, textAlign: 'center', fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Choose your kind of magic
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Discover spaces built for music lovers, builders, founders, foodies, and everyone in between.
          </Typography>

          <Grid container spacing={SPACING.standard} justifyContent="center">
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
              sx={{ ...BUTTON_STYLES, px: 3 }}
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
          <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, mb: 1, textAlign: 'center', fontSize: { xs: '1.5rem', md: '2rem' } }}>
            The community behind the gatherings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5, textAlign: 'center' }}>
            Discover the organizations and venues powering the events you care about.
          </Typography>

          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                Featured organizations
              </Typography>
              <Button component={Link} href={ROUTES.ORGANIZATIONS.ROOT} variant="text" size="small" color="secondary" sx={BUTTON_STYLES}>
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
              <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                Featured venues
              </Typography>
              <Button component={Link} href={ROUTES.VENUES.ROOT} variant="text" size="small" color="secondary" sx={BUTTON_STYLES}>
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
              <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                Social layer
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Follow hosts, friends, and organizations, share your intent with the right audience, and catch the
                moments your circle is creating in one place.
              </Typography>
              <Stack spacing={1}>
                {socialHighlights.map(highlight => (
                  <Card
                    key={highlight.title}
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
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
                  </Card>
                ))}
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  component={Link}
                  href={isAuth ? ROUTES.EVENTS.ROOT : ROUTES.AUTH.LOGIN}
                  sx={{ ...BUTTON_PRIMARY_STYLES, borderRadius: 999 }}
                >
                  {socialCtaLabel}
                </Button>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  ...CARD_STYLES,
                  minHeight: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Activity preview
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Live updates shaped by the people you follow.
                </Typography>
                <Stack spacing={2} flexGrow={1}>
                  {isAuth && socialFeed.length > 0 ? (
                    socialFeed.map(activity => {
                      const actorName = getActorDisplayName(activity);
                      const objectLabel = getObjectLabel(activity);
                      const objectLink = getObjectLink(activity);
                      const verbLabel = verbLabels[activity.verb] ?? activity.verb;
                      const timestampLabel = formatActivityDate(activity.createdAt ?? activity.eventAt);
                      const actorLink = activity.actor?.username ? ROUTES.USERS.USER(activity.actor.username) : null;
                      
                      // Get activity type icon
                      const getActivityIcon = () => {
                        if (activity.objectType === 'Event') return <EventIcon sx={{ fontSize: 14 }} />;
                        if (activity.objectType === 'User') return <Person sx={{ fontSize: 14 }} />;
                        if (activity.objectType === 'Organization') return <Business sx={{ fontSize: 14 }} />;
                        return null;
                      };

                      return (
                        <Box
                          key={activity.activityId}
                          sx={{
                            display: 'flex',
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            transition: 'border-color 0.2s',
                            '&:hover': {
                              borderColor: 'text.secondary',
                            },
                          }}
                        >
                          {/* Actor Avatar */}
                          {actorLink ? (
                            <Link href={actorLink} style={{ textDecoration: 'none' }}>
                              <Avatar
                                src={activity.actor?.profile_picture || undefined}
                                alt={actorName}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: 'action.selected',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer',
                                }}
                              >
                                {actorName.charAt(0).toUpperCase()}
                              </Avatar>
                            </Link>
                          ) : (
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: 'action.selected',
                                fontSize: '0.875rem',
                              }}
                            >
                              {actorName.charAt(0).toUpperCase()}
                            </Avatar>
                          )}

                          {/* Activity Content */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                              {actorLink ? (
                                <Link href={actorLink} style={{ textDecoration: 'none', color: 'inherit' }}>
                                  <Typography component="span" sx={{ fontWeight: 600, '&:hover': { color: 'primary.main' } }}>
                                    {actorName}
                                  </Typography>
                                </Link>
                              ) : (
                                <Typography component="span" sx={{ fontWeight: 600 }}>
                                  {actorName}
                                </Typography>
                              )}{' '}
                              <Typography component="span" color="text.secondary">
                                {verbLabel}
                              </Typography>{' '}
                              {objectLink ? (
                                <Link href={objectLink} style={{ textDecoration: 'none', color: 'inherit' }}>
                                  <Typography component="span" sx={{ fontWeight: 600, '&:hover': { color: 'primary.main' } }}>
                                    {objectLabel}
                                  </Typography>
                                </Link>
                              ) : (
                                <Typography component="span" sx={{ fontWeight: 600 }}>
                                  {objectLabel}
                                </Typography>
                              )}
                            </Typography>

                            {/* Timestamp & Type */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              {timestampLabel && (
                                <Typography variant="caption" color="text.secondary">
                                  {timestampLabel}
                                </Typography>
                              )}
                              {activity.objectType && (
                                <Chip
                                  size="small"
                                  icon={getActivityIcon() || undefined}
                                  label={activity.objectType}
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    bgcolor: 'action.selected',
                                    '& .MuiChip-icon': { fontSize: 12, ml: 0.5 },
                                    '& .MuiChip-label': { px: 0.75 },
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
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
              </Card>
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
          <Grid container spacing={SPACING.standard} alignItems="center">
            {experiencePillars.map(pillar => (
              <Grid size={{ xs: 12, md: 4 }} key={pillar.title}>
                <Card
                  elevation={0}
                  sx={{
                    ...CARD_STYLES,
                    height: '100%',
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
                  <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, mb: 1 }}>
                    {pillar.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pillar.copy}
                  </Typography>
                </Card>
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
          <Card
            elevation={0}
            sx={{
              ...CARD_STYLES,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
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
                sx={{ ...BUTTON_PRIMARY_STYLES, borderRadius: 10 }}
              >
                Start hosting
              </Button>
              <Button variant="outlined" color="inherit" size="large" component={Link} href={ROUTES.EVENTS.ROOT} sx={BUTTON_STYLES}>
                See community events
              </Button>
            </Box>
          </Card>
        </CustomContainer>
      </Box>
    </Box>
  );
}
