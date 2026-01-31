import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { ArrowOutward } from '@mui/icons-material';
import { Location } from '@/data/graphql/types/graphql';
import { formatAddressForSearch, getLocationNavigationUrl } from '@/components/events/location-utils';

interface EventLocationMapProps {
  location: Location;
}

const MAP_DELTA = 0.0125;

const getMapEmbedUrl = (latitude: number, longitude: number): string => {
  const left = longitude - MAP_DELTA;
  const right = longitude + MAP_DELTA;
  const bottom = latitude - MAP_DELTA;
  const top = latitude + MAP_DELTA;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const getAddressMapEmbedUrl = (address: string): string =>
  `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;

export default function EventLocationMap({ location }: EventLocationMapProps) {
  if (location.locationType !== 'venue') {
    return null;
  }

  const coordinates = location.coordinates;
  const navigationUrl = getLocationNavigationUrl(location);
  const addressLabel = formatAddressForSearch(location);

  const mapUrl =
    coordinates != null
      ? getMapEmbedUrl(coordinates.latitude, coordinates.longitude)
      : addressLabel
        ? getAddressMapEmbedUrl(addressLabel)
        : null;
  const showAddressDisclaimer = !coordinates && Boolean(addressLabel);

  if (!mapUrl) {
    if (!navigationUrl) {
      return null;
    }

    return (
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h6" fontWeight={600}>
              Map preview coming soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We&apos;re still waiting on precise coordinates for this venue. In the meantime, you can open it directly
              in your maps app.
            </Typography>
            <Button
              component="span"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (navigationUrl) {
                  window.open(navigationUrl, '_blank', 'noopener');
                }
              }}
              variant="outlined"
              startIcon={<ArrowOutward />}
            >
              Open in Maps
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }
  const clickableCardProps = navigationUrl
    ? {
        component: 'a' as const,
        href: navigationUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      }
    : undefined;
  const cardBaseSx = {
    mb: 3,
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    overflow: 'hidden',
  };
  const clickableSx = navigationUrl ? { textDecoration: 'none', color: 'inherit', cursor: 'pointer' } : {};

  return (
    <Card elevation={0} sx={[cardBaseSx, clickableSx]} {...(clickableCardProps ?? {})}>
      <CardContent sx={{ p: 0 }}>
        <Box
          component="iframe"
          src={mapUrl}
          title="Event location map"
          loading="lazy"
          sx={{
            width: '100%',
            minHeight: 220,
            border: 0,
          }}
          referrerPolicy="no-referrer"
        />
        <Stack spacing={1.25} sx={{ p: 3 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1 }}>
            Location Map
          </Typography>
          {addressLabel && (
            <Typography variant="body2" color="text.secondary">
              {addressLabel}
            </Typography>
          )}
          {showAddressDisclaimer && (
            <Typography variant="caption" color="text.secondary">
              Map is an approximate view based on the venue address.
            </Typography>
          )}
          {navigationUrl && (
            <Button
              component="span"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.open(navigationUrl, '_blank', 'noopener');
              }}
              startIcon={<ArrowOutward />}
            >
              Open in Maps
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
