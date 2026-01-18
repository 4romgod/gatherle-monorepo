import { Box } from '@mui/material';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { getClient } from '@/data/graphql';
import {
  GetAllEventCategoriesDocument,
  GetAllEventsDocument,
  GetSocialFeedDocument,
  GetSocialFeedQuery,
} from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { HeroSection, FeaturedEvents, CategoryExplorer, SocialFeed } from '@/components/home';

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

const SOCIAL_FEED_LIMIT = 4;

export default async function HomePage() {
  const session = await auth();
  const isAuth = !!session?.user;
  const token = session?.user?.token;

  // Get user data from session for personalization (populated at login)
  const sessionUser = session?.user;
  const userLocation = sessionUser?.location ? {
    city: sessionUser.location.city,
    country: sessionUser.location.country,
    latitude: sessionUser.location.coordinates?.latitude,
    longitude: sessionUser.location.coordinates?.longitude,
  } : null;
  const userInterestIds = sessionUser?.interests?.map(i => i.eventCategoryId) ?? [];

  // Fetch events - personalized for authenticated users with location, all events otherwise
  let eventList: EventPreview[] = [];
  let personalizedFetchSucceeded = false;

  if (isAuth && userLocation) {
    // Fetch events filtered by user's location
    try {
      const locationFilter = {
        city: userLocation.city,
        country: userLocation.country,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };

      // Strategy 1: Try location + interests (most relevant)
      if (userInterestIds.length > 0) {
        const eventsResponse = await getClient().query({
          query: GetAllEventsDocument,
          variables: {
            options: {
              location: locationFilter,
              filters: [{ field: 'eventCategories.eventCategoryId', value: userInterestIds }],
              pagination: { limit: 20 },
            },
          },
          context: { headers: { token } },
        });
        eventList = (eventsResponse.data.readEvents ?? []) as EventPreview[];
      }

      // Strategy 2: If no results with interests, fallback to location-only
      if (eventList.length === 0) {
        const eventsResponse = await getClient().query({
          query: GetAllEventsDocument,
          variables: {
            options: {
              location: locationFilter,
              pagination: { limit: 20 },
            },
          },
          context: { headers: { token } },
        });
        eventList = (eventsResponse.data.readEvents ?? []) as EventPreview[];
      }

      personalizedFetchSucceeded = true;
    } catch (error) {
      console.error('Unable to fetch personalized events, falling back to all events', error);
    }
  }

  // Fallback to all events only if:
  // 1. User is not authenticated or has no location preferences, OR
  // 2. Personalized fetch failed (error state)
  // Do NOT fallback if personalized fetch succeeded but returned empty results
  // (user with location preferences should see no events rather than irrelevant global ones)
  const shouldFetchAllEvents = !isAuth || !userLocation || !personalizedFetchSucceeded;
  if (shouldFetchAllEvents) {
    const eventsResponse = await getClient().query({ query: GetAllEventsDocument });
    eventList = (eventsResponse.data.readEvents ?? []) as EventPreview[];
  }

  // Fetch categories
  const { data } = await getClient().query({ query: GetAllEventCategoriesDocument });
  const eventCategories = data.readEventCategories?.slice(0, 6) ?? [];
  
  const featuredEvents = eventList.slice(0, 8);
  const heroEvent = eventList[0] ?? null;

  // Fetch social feed for authenticated users with valid tokens
  let socialFeed: GetSocialFeedQuery['readFeed'] = [];

  const hasValidToken = token && typeof token === 'string' && token.split('.').length === 3;

  if (isAuth && hasValidToken) {
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

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
      <HeroSection heroEvent={heroEvent} />
      <FeaturedEvents events={featuredEvents} />
      <CategoryExplorer categories={eventCategories} />
      <SocialFeed 
        isAuthenticated={isAuth} 
        hasToken={!!hasValidToken} 
        socialFeed={socialFeed} 
      />
    </Box>
  );
}
