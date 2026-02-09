'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useQuery } from '@apollo/client';
import {
  DateFilterOption,
  GetAllEventsDocument,
  GetAllEventsQuery,
  GetAllEventsQueryVariables,
  LocationFilterInput,
} from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import { getAuthHeader, logger } from '@/lib/utils';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';
import EventBoxSm from '@/components/events/eventBoxSm';
import EventBoxSmSkeleton from '@/components/events/eventBoxSm/EventBoxSmSkeleton';
import { ROUTES } from '@/lib/constants';
import { useSavedLocation } from '@/hooks/useSavedLocation';

const LOCATION_RADIUS_KM = 50;

type LocationPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export default function NearbyEventsSection() {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const userId = session?.user?.userId;

  const { location: savedLocation, setLocation: setSavedLocation } = useSavedLocation(userId);

  const [locationFilter, setLocationFilter] = useState<LocationFilterInput>();
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('idle');
  const [statusMessage, setStatusMessage] = useState('Share your location to discover events near you this weekend.');

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionState('unsupported');
      setStatusMessage('Location services are not available in your browser.');
      return;
    }

    setPermissionState('requesting');
    setStatusMessage('Requesting permission to read your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radiusKm: LOCATION_RADIUS_KM,
        };
        setLocationFilter(nextLocation);
        setSavedLocation(nextLocation);
        setPermissionState('granted');
        setStatusMessage('');
      },
      (error) => {
        logger.error('Error acquiring location', error);
        setLocationFilter(undefined);
        if (error.code === 1) {
          setStatusMessage('Please allow location access to surface events near you.');
        } else {
          setStatusMessage('Unable to determine your location. Please try again.');
        }
        setPermissionState('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }, [setLocationFilter, setPermissionState, setSavedLocation, setStatusMessage]);

  useEffect(() => {
    if (permissionState === 'idle') {
      requestLocation();
    }
  }, [permissionState, requestLocation]);

  const helperText = useMemo(() => {
    if (permissionState === 'requesting') {
      return 'Requesting access to your location...';
    }
    if (permissionState === 'granted') {
      return 'Showing events happening nearby this weekend.';
    }
    if (permissionState === 'denied' || permissionState === 'unsupported') {
      return statusMessage;
    }
    return 'Share your location to discover the most relevant events nearby.';
  }, [permissionState, statusMessage]);

  const shouldShowActionButton = permissionState === 'denied';

  const { data, loading, error } = useQuery<GetAllEventsQuery, GetAllEventsQueryVariables>(GetAllEventsDocument, {
    skip: !locationFilter,
    variables: {
      options: {
        location: locationFilter,
        dateFilterOption: DateFilterOption.ThisWeekend,
      },
    },
    fetchPolicy: 'cache-and-network',
    context: {
      headers: getAuthHeader(token),
    },
  });

  const events = data?.readEvents ?? [];
  const isLoadingContent = Boolean(locationFilter) && loading;
  const locationLabel = useMemo(() => {
    if (events.length === 0) {
      return null;
    }

    const cityCounts: Record<string, number> = {};
    let topCity: string | null = null;
    let topCount = 0;

    events.forEach((event) => {
      const address = event.location?.address;
      const label = [address?.city, address?.state].filter(Boolean).join(', ');
      if (!label) {
        return;
      }

      const nextCount = (cityCounts[label] ?? 0) + 1;
      cityCounts[label] = nextCount;
      if (nextCount > topCount) {
        topCount = nextCount;
        topCity = label;
      }
    });

    return topCity;
  }, [events]);

  useEffect(() => {
    if (!locationLabel || !locationFilter) {
      return;
    }

    if (savedLocation.displayLabel === locationLabel) {
      return;
    }

    setSavedLocation({
      latitude: locationFilter.latitude ?? undefined,
      longitude: locationFilter.longitude ?? undefined,
      radiusKm: locationFilter.radiusKm ?? undefined,
      displayLabel: locationLabel,
    });
  }, [locationFilter, locationLabel, savedLocation.displayLabel, setSavedLocation]);

  const renderContent = () => {
    const renderLoading = () => (
      <CarouselSkeleton
        itemCount={3}
        itemWidth={260}
        viewAll={false}
        renderSkeletonItem={() => <EventBoxSmSkeleton />}
      />
    );

    if (permissionState === 'requesting') {
      return renderLoading();
    }

    if (!locationFilter) {
      return (
        <Box
          sx={{
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            backgroundColor: 'background.paper',
          }}
        >
          <Typography color="text.secondary" textAlign="center" sx={{ px: 2 }}>
            {helperText}
          </Typography>
        </Box>
      );
    }

    if (isLoadingContent) {
      return renderLoading();
    }

    if (error) {
      return <Typography color="error">Failed to load nearby events. Try again shortly.</Typography>;
    }

    if (events.length === 0) {
      return (
        <Typography color="text.secondary">
          No events were found near you this weekend. Try checking back later or expand your radius.
        </Typography>
      );
    }

    return (
      <Stack gap={{ xs: 1.5, md: 2 }}>
        <Carousel
          items={events}
          viewAllButton={{ href: ROUTES.EVENTS.ROOT }}
          renderItem={(event) => <EventBoxSm event={event} />}
        />
      </Stack>
    );
  };

  return (
    <Box sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 1, md: 2 } }}>
      <Container>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mb: { xs: 0.5, md: 1 }, fontSize: { xs: '1.1rem', md: '1.25rem' } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            {locationLabel ? `Events near ${locationLabel}` : 'Events near you'}
            {shouldShowActionButton && (
              <Button variant="outlined" size="small" onClick={requestLocation}>
                Share my location
              </Button>
            )}
          </Box>
        </Typography>
        {permissionState !== 'requesting' && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {helperText}
          </Typography>
        )}
        {renderContent()}
      </Container>
    </Box>
  );
}
