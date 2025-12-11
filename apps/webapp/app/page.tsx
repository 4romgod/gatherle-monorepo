import {
  AutoAwesome,
  Explore,
  RocketLaunch,
  ShieldMoon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { Metadata } from 'next';
import CustomContainer from '@/components/custom-container';
import EventsCarousel from '@/components/events/carousel';
import EventCategoryBox from '@/components/events/category/box';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import { RRule } from 'rrule';

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

export default async function HomePage() {
  const { data: events } = await getClient().query({ query: GetAllEventsDocument });
  const { data } = await getClient().query({ query: GetAllEventCategoriesDocument });
  const eventCategories = data.readEventCategories?.slice(0, 6) ?? [];
  const featuredEvents = events.readEvents?.slice(0, 8) ?? [];
  const heroEvent = events.readEvents?.[0];
  const heroEventRsvps = heroEvent?.rSVPList?.length ?? 0;

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
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
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
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: '#f8fafc',
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              />
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2rem', md: '2.6rem' },
                  lineHeight: 1.1,
                  mb: 2,
                  color: '#f8fafc',
                }}
              >
                Where unforgettable experiences find their people.
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 400,
                  fontSize: { xs: '1rem', md: '1.08rem' },
                  color: 'rgba(226, 232, 240, 0.85)',
                  mb: 3,
                }}
              >
                Ntlango is the modern layer for community-led events—discover inspiring gatherings or host your own with gorgeous, human-first pages.
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
                    borderColor: 'rgba(255,255,255,0.4)',
                    color: '#f8fafc',
                    '&:hover': { borderColor: '#f8fafc', backgroundColor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  Host with Ntlango
                </Button>
              </Box>
              <Grid container spacing={2}>
                {heroStats.map((stat) => (
                  <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.75)' }}>
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
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: '#e2e8f0',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
                }}
              >
                <Typography variant="overline" sx={{ color: 'rgba(226,232,240,0.7)', letterSpacing: 1 }}>
                  Featured gathering
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#f8fafc', mt: 1 }}>
                  {heroEvent?.title ?? 'Immersive night market'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.75)', mt: 1.5 }}>
                  {heroEvent ? RRule.fromString(heroEvent.recurrenceRule).toText() : 'Every Friday · 7:00pm'}
                </Typography>
                <Box
                  sx={{
                    mt: 3,
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
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
                  <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>
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
        id="explore-categories"
        sx={{
          backgroundColor: 'background.paper',
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
              )
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
        id="create-event-cta"
        sx={{
          backgroundColor: 'background.default',
          py: { xs: 5, md: 7 },
        }}
      >
        <CustomContainer>
          <Grid container spacing={3} alignItems="center">
            {experiencePillars.map((pillar) => (
              <Grid size={{ xs: 12, md: 4 }} key={pillar.title}>
                <Paper
                  sx={{
                    p: 2.25,
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
              backgroundColor: 'background.paper',
              boxShadow: '0 18px 36px rgba(0,0,0,0.08)',
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
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                component={Link}
                href={ROUTES.EVENTS.ROOT}
              >
                See community events
              </Button>
            </Box>
          </Paper>
        </CustomContainer>
      </Box>
    </Box>
  );
}
