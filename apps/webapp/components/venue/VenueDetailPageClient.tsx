'use client';

import Link from 'next/link';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import {
  alpha,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack, Close, Language, LocationOn, People, PhotoLibrary } from '@mui/icons-material';
import { GetEventsByVenueDocument, GetVenueBySlugDocument } from '@/data/graphql/query';
import type { GetVenueBySlugQuery, Location } from '@/data/graphql/types/graphql';
import type { EventPreview } from '@/data/graphql/query/Event/types';
import EventLocationMap from '@/components/events/EventLocationMap';
import EventBoxSm from '@/components/events/eventBoxSm';
import ErrorPage from '@/components/errors/ErrorPage';
import VenueDetailSkeleton from '@/components/venue/VenueDetailSkeleton';
import { ROUTES } from '@/lib/constants';
import { isNotFoundGraphQLError } from '@/lib/utils/error-utils';

import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils/auth';
import Carousel from '@/components/carousel';
import CarouselSkeleton from '@/components/carousel/CarouselSkeleton';

const DEFAULT_VENUE_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=80';

type VenueLocationSource = NonNullable<GetVenueBySlugQuery['readVenueBySlug']>;

const buildVenueLocation = (venue: VenueLocationSource): Location => {
  const address = venue.address
    ? {
        city: venue.address.city,
        country: venue.address.country,
        state: venue.address.region ?? '',
        zipCode: venue.address.postalCode ?? '',
        ...(venue.address.street ? { street: venue.address.street } : {}),
      }
    : undefined;

  return {
    locationType: 'venue',
    address,
    coordinates: venue.geo
      ? {
          latitude: venue.geo.latitude,
          longitude: venue.geo.longitude,
        }
      : undefined,
  };
};

interface VenueDetailPageClientProps {
  slug: string;
}

export default function VenueDetailPageClient({ slug }: VenueDetailPageClientProps) {
  const { data: session } = useSession();
  const authContext = { headers: getAuthHeader(session?.user?.token) };

  const { data, loading, error } = useQuery(GetVenueBySlugDocument, {
    variables: { slug },
    fetchPolicy: 'cache-and-network',
  });

  const venue = data?.readVenueBySlug;
  const heroImage = venue?.featuredImageUrl ?? venue?.images?.[0] ?? DEFAULT_VENUE_IMAGE;
  const addressParts = [
    venue?.address?.street,
    venue?.address?.city,
    venue?.address?.region,
    venue?.address?.country,
  ].filter(Boolean);
  const addressLabel = addressParts.join(', ');
  const galleryImages = (venue?.images ?? []).filter((img) => img && img !== heroImage).slice(0, 4) ?? [];
  const eventFilterOptions = useMemo(() => {
    if (!venue?.venueId) return undefined;
    return {
      pagination: { limit: 6 },
      filters: [{ field: 'venueId', value: venue.venueId }],
    };
  }, [venue?.venueId]);

  const { data: venueEventsData, loading: eventsLoading } = useQuery(GetEventsByVenueDocument, {
    skip: !eventFilterOptions,
    variables: { options: eventFilterOptions },
    fetchPolicy: 'cache-and-network',
    context: authContext,
  });

  const venueEvents = (venueEventsData?.readEvents ?? []) as EventPreview[];
  const hasVenueEvents = venueEvents.length > 0;
  const galleryItems = useMemo(() => {
    const seen = new Set<string>();
    const items: string[] = [];
    [heroImage, ...(venue?.images ?? [])].forEach((img) => {
      if (img && !seen.has(img)) {
        seen.add(img);
        items.push(img);
      }
    });
    return items;
  }, [heroImage, venue?.images]);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeImage && galleryItems.length > 0) {
      setActiveImage(galleryItems[0]);
    }
  }, [activeImage, galleryItems]);

  const handleGalleryOpen = useCallback(
    (image?: string) => {
      const nextImage = image ?? galleryItems[0];
      if (nextImage) {
        setActiveImage(nextImage);
        setGalleryOpen(true);
      }
    },
    [galleryItems],
  );

  const handleGalleryClose = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  const notFoundError = isNotFoundGraphQLError(error);

  if (notFoundError) {
    return (
      <ErrorPage
        statusCode={404}
        title="Venue not found"
        message="We couldn’t find that venue. It may have been removed or the link is incorrect."
        ctaLabel="Browse venues"
        ctaHref={ROUTES.VENUES.ROOT}
      />
    );
  }

  const isLoading = loading || (!venue && !error);

  if (isLoading) {
    return <VenueDetailSkeleton />;
  }

  if (error || !venue) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="error">Unable to load this venue right now.</Typography>
      </Container>
    );
  }

  const venueLocation = buildVenueLocation(venue);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 280, sm: 320, md: 360 },
          width: '100%',
          overflow: 'hidden',
          bgcolor: 'grey.900',
        }}
      >
        <Box
          component="img"
          src={heroImage}
          alt={venue.name ?? 'Venue cover'}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 30%',
          }}
        />
        <Box
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.8)} 0%, ${alpha(
              theme.palette.common.black,
              0.2,
            )} 60%, transparent 100%)`,
          })}
        />
        <Container
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 2,
            pb: { xs: 4, md: 6 },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={Link}
              href={ROUTES.VENUES.ROOT}
              startIcon={<ArrowBack />}
              variant="contained"
              color="primary"
              sx={{
                bgcolor: 'background.paper',
                color: 'text.primary',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'background.paper',
                },
              }}
            >
              Back to venues
            </Button>
            {galleryItems.length > 0 && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PhotoLibrary />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  borderColor: 'rgba(255, 255, 255, 0.6)',
                }}
                onClick={() => handleGalleryOpen()}
              >
                View gallery
              </Button>
            )}
          </Stack>
          <Box>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                color: 'common.white',
                lineHeight: 1.2,
                fontSize: { xs: '2rem', md: '2.5rem' },
              }}
            >
              {venue.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip
                label={venue.type ?? 'Venue'}
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  fontWeight: 600,
                  borderRadius: 1,
                }}
              />
              {venue.capacity && (
                <Chip
                  icon={<People sx={{ fontSize: 16 }} />}
                  label={`Capacity ${venue.capacity.toLocaleString()}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.6)',
                    color: 'rgba(255, 255, 255, 0.85)',
                    textTransform: 'none',
                  }}
                />
              )}
            </Stack>
            {addressLabel && (
              <Typography variant="body2" color="common.white" sx={{ mt: 1 }}>
                {addressLabel}
              </Typography>
            )}
          </Box>
        </Container>
      </Box>

      <Container sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Venue overview
                </Typography>
                <Stack spacing={1}>
                  {addressLabel && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{addressLabel}</Typography>
                    </Stack>
                  )}
                  {venue.geo && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        Coordinates:
                      </Typography>
                      <Typography variant="body2">
                        {venue.geo.latitude.toFixed(4)}, {venue.geo.longitude.toFixed(4)}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>

              <EventLocationMap location={venueLocation} />

              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Amenities
                </Typography>
                {venue.amenities && venue.amenities.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {venue.amenities.map((amenity) => (
                      <Chip key={amenity} label={amenity} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No amenities listed yet.
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              {venue.url && (
                <Button
                  component="a"
                  href={venue.url}
                  target="_blank"
                  rel="noreferrer"
                  variant="outlined"
                  startIcon={<Language />}
                  sx={{ fontWeight: 600, textTransform: 'none' }}
                >
                  Visit venue website
                </Button>
              )}

              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  More details
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2">
                      Capacity: {venue.capacity?.toLocaleString() ?? 'Not specified'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2">Venue type: {venue.type ?? 'Unknown'}</Typography>
                  </Stack>
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Gallery
                </Typography>
                {galleryImages.length > 0 ? (
                  <Stack direction="row" spacing={1}>
                    {galleryImages.map((image) => (
                      <Box
                        key={image}
                        component="img"
                        src={image}
                        alt={`${venue.name ?? 'Venue'} photo`}
                        sx={{
                          width: '100%',
                          maxWidth: 120,
                          height: 80,
                          borderRadius: 2,
                          objectFit: 'cover',
                          objectPosition: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleGalleryOpen(image)}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    More photos coming soon.
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>
        </Grid>
        <Box sx={{ mt: 6 }}>
          {eventsLoading && !hasVenueEvents ? (
            <CarouselSkeleton title="Events hosted here" itemCount={3} />
          ) : hasVenueEvents ? (
            <Carousel
              title="Events hosted here"
              items={venueEvents}
              itemWidth={320}
              viewAllButton={{
                href: ROUTES.EVENTS.ROOT,
                label: 'Browse events',
              }}
              itemKey={(event) => event.eventId}
              renderItem={(event) => (
                <Box>
                  <EventBoxSm event={event} href={ROUTES.EVENTS.EVENT(event.slug)} />
                </Box>
              )}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              This venue has not hosted any events yet.
            </Typography>
          )}
        </Box>
      </Container>

      <Dialog fullWidth maxWidth="lg" open={galleryOpen} onClose={handleGalleryClose}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          Venue photos
          <IconButton onClick={handleGalleryClose} size="large">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            pb: 3,
            textAlign: 'center',
          }}
        >
          {activeImage && (
            <Box
              component="img"
              src={activeImage}
              alt="Venue photo"
              sx={{
                width: '100%',
                maxHeight: 480,
                borderRadius: 3,
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          )}
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" mt={2}>
            {galleryItems.map((image) => (
              <Box
                key={image}
                component="img"
                src={image}
                alt="Venue thumbnail"
                onClick={() => setActiveImage(image)}
                sx={{
                  width: 100,
                  height: 80,
                  borderRadius: 2,
                  objectFit: 'cover',
                  objectPosition: 'center',
                  border: (theme) =>
                    activeImage === image ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      <Divider />
    </Box>
  );
}
