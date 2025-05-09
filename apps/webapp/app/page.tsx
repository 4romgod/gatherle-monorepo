import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
} from '@mui/material';
import Link from 'next/link';
import { Search, LocationOn, Explore } from '@mui/icons-material';
import { GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { Metadata } from 'next';
import { getEventCategoryIcon } from '@/lib/constants';
import EventsCarousel from '@/components/events/carousel';

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
  const { data: eventCategories } = await getClient().query({ query: GetAllEventCategoriesDocument });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        id="hero-section"
        sx={{
          py: 15,
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3a0088 0%,rgb(46, 126, 6) 50%,rgb(46, 177, 10) 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Box sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.1,
          zIndex: 0,
          backgroundImage: 'url("/api/placeholder/1200/800")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  color: 'white',
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  mb: 2,
                  lineHeight: 1.2
                }}
              >
                Where Connections Happen
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  mb: 4,
                  maxWidth: '80%'
                }}
              >
                Discover events that match your passions, meet fascinating people, and create memorable experiences.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box
        id="explore-categories"
        sx={{ backgroundColor: '#f7f9fc', py: 8 }}
      >
        <Container>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, textAlign: 'center' }}>
            Explore by Category
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            {eventCategories.readEventCategories.map((category, index) => {
              const IconComponent = getEventCategoryIcon(category.iconName);
              return (
                <Grid item xs={6} sm={4} md={2} key={index}>
                  <Button
                    component={Link}
                    href={`/events#${category.name}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      minHeight: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      borderRadius: 2,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
                        backgroundColor: '#fffaf0'
                      },
                      p: 2
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: '2rem',
                        mb: 1,
                        width: 50,
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.04)',
                        marginBottom: 2
                      }}
                    >
                      <IconComponent
                        color={category.color || ''}
                        height={24}
                        width={24}
                      />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      component="span"
                      fontWeight="medium"
                      color="text.primary"
                    >
                      {category.name}
                    </Typography>
                  </Button>
                </Grid>
              )
            })}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Explore />}
              component={Link}
              href="#"  // TODO create a page for all categories
              sx={{ borderRadius: 4, px: 3 }}
            >
              Explore All Categories
            </Button>
          </Box>
        </Container>
      </Box>

      <Box
        id="create-event-cta"
        sx={{
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            fontWeight="bold"
            sx={{ mb: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}
          >
            Ready to Host Your Own Event?
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 700, mx: 'auto', fontWeight: 'normal' }}
          >
            Share your passion, grow your community, and bring people together with events that matter.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            href="/create-event"
            sx={{
              borderRadius: 2,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              fontSize: '1.1rem'
            }}
          >
            Create an Event
          </Button>
        </Container>
      </Box>

      <Box
        id="featured-events"
        sx={{ backgroundColor: '#f7f9fc', py: 8 }}
      >
        <Container>
          <EventsCarousel
            events={events.readEvents}
            title="Upcoming Events"
            autoplay={true}
            autoplayInterval={6000}
            itemWidth={350}
            showIndicators={true}
          />
        </Container>
      </Box>

      <Container
        id="app-download"
        maxWidth="lg"
        sx={{ py: 8 }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Take Your Events On The Go
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
              Download our mobile app to discover events, manage your RSVPs, and connect with attendees - all from the palm of your hand.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                sx={{
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 3
                }}
              >
                <Box component="img" src="/api/placeholder/24/24" alt="Apple Logo" />
                App Store
              </Button>
              <Button
                variant="outlined"
                color="primary"
                sx={{
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 3
                }}
              >
                <Box component="img" src="/api/placeholder/24/24" alt="Google Play Logo" />
                Google Play
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              component="img"
              src="/api/placeholder/400/600"
              alt="Mobile App Preview"
              sx={{
                maxWidth: { xs: '80%', md: '60%' },
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              }}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}