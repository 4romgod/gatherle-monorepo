import Link from 'next/link';
import { Box, Button, Card, CardActions, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
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

const VenueCard = ({ venueId, name, type, capacity, address, amenities }: VenueCardProps) => {
  const addressLabel = [address?.city, address?.region, address?.country].filter(Boolean).join(', ');
  const detailsHref = venueId ? `${ROUTES.VENUES.ROOT}/${venueId}` : ROUTES.VENUES.ROOT;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Chip
            label={type ?? 'Venue'}
            size="small"
            sx={{
              textTransform: 'uppercase',
              fontWeight: 600,
              fontSize: '0.7rem',
              letterSpacing: '0.5px',
              bgcolor: 'primary.50',
              color: 'primary.main',
              border: '1px solid',
              borderColor: 'primary.200',
            }}
          />
        </Box>

        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            mb: 2,
            fontSize: '1.5rem',
            lineHeight: 1.2,
            color: 'text.primary',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name ?? 'Unnamed space'}
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {addressLabel && (
            <Box display="flex" alignItems="center" gap={1}>
              <LocationOnIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {addressLabel}
              </Typography>
            </Box>
          )}
          {capacity && (
            <Box display="flex" alignItems="center" gap={1}>
              <PeopleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                Capacity: <strong>{capacity.toLocaleString()}</strong>
              </Typography>
            </Box>
          )}
        </Stack>

        {amenities && amenities.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {amenities.slice(0, 3).map(amenity => (
                <Chip
                  key={amenity}
                  label={amenity}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              ))}
              {amenities.length > 3 && (
                <Chip
                  label={`+${amenities.length - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    color: 'primary.main',
                    borderColor: 'primary.main',
                  }}
                />
              )}
            </Stack>
          </>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', px: 3, py: 2.5 }}>
        {venueId ? (
          <Button
            variant="contained"
            size="medium"
            component={Link}
            href={detailsHref}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            View Details
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="medium"
            component={Link}
            href={ROUTES.VENUES.ROOT}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Browse Venues
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default VenueCard;
