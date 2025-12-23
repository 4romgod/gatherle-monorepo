import Link from 'next/link';
import { Box, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';

export type VenueCardProps = {
  venueId?: string;
  name?: string;
  type?: string;
  capacity?: number;
  url?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
  };
  amenities?: string[];
};

const VenueCard = ({ name, type, capacity, address, amenities }: VenueCardProps) => {
  const addressLabel = [address?.city, address?.region, address?.country].filter(Boolean).join(', ');

  return (
    <Card elevation={0} sx={{ borderRadius: 3, minHeight: 220, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="overline" color="text.secondary">
          {type ?? 'Venue'}
        </Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
          {name ?? 'Unnamed space'}
        </Typography>
        {addressLabel && (
          <Typography variant="body2" color="text.secondary">
            {addressLabel}
          </Typography>
        )}
        {capacity && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Capacity · {capacity.toLocaleString()}
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2} gap={1}>
          {amenities?.slice(0, 3).map((amenity) => (
            <Chip key={amenity} label={amenity} size="small" />
          ))}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button variant="outlined" size="small" component={Link} href={ROUTES.VENUES.ROOT}>
          View venues
        </Button>
        <Button variant="contained" size="small" component={Link} href={ROUTES.EVENTS.ROOT}>
          Browse events
        </Button>
      </CardActions>
    </Card>
  );
};

export default VenueCard;
