import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import Link from 'next/link';
import { Explore } from '@mui/icons-material';
import { GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { Metadata } from 'next';
import { getEventCategoryIcon } from '@/lib/constants';
import EventsCarousel from '@/components/events/carousel';
import { ROUTES } from '@/lib/constants';
import EventCategoryBox from '@/components/events/category/box';

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
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          backgroundColor: 'background.default',
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
                  // color: 'white',
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
        sx={{
          backgroundColor: 'background.paper',
          py: 8
        }}
      >
        <Container>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, textAlign: 'center' }}>
            Explore by Category
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            {eventCategories.readEventCategories.map((category, index) => {
              return (
                <Grid item xs={6} sm={4} md={2} key={index}>
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
          backgroundColor: 'background.default',
          textAlign: 'center',
          py: 8,
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
            href={ROUTES.ACCOUNT.EVENTS.CREATE}
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
        sx={{
          backgroundColor: 'background.paper',
          py: 8
        }}
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
    </Box>
  );
}