import Link from 'next/link';
import { alpha, Box, Button, Card, CardActions, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import { ROUTES } from '@/lib/constants';
import Surface from '@/components/core/Surface';

export type VenueCardProps = {
  venueId?: string;
  name?: string;
  type?: string;
  capacity?: number | null;
  url?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
  } | null;
  amenities?: string[] | null;
  slug?: string;
  images?: string[] | null;
  featuredImageUrl?: string | null;
};

const VenueCard = ({
  venueId,
  name,
  type,
  capacity,
  address,
  amenities,
  slug,
  images,
  featuredImageUrl,
}: VenueCardProps) => {
  const addressLabel = [address?.city, address?.region, address?.country].filter(Boolean).join(', ');
  const heroImageUrl = featuredImageUrl ?? images?.[0];
  const detailsHref = slug
    ? ROUTES.VENUES.VENUE(slug)
    : venueId
      ? `${ROUTES.VENUES.ROOT}/${venueId}`
      : ROUTES.VENUES.ROOT;

  return (
    <Surface
      component={Card}
      sx={(theme) => ({
        borderRadius: 3,
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        boxShadow: theme.shadows[2],
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      })}
    >
      {heroImageUrl && (
        <Box
          sx={{
            width: '100%',
            height: 160,
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src={heroImageUrl}
            alt={name ?? 'Venue image'}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
          <Box
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.7)} 0%, transparent 60%)`,
            })}
          />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, p: 3, pt: heroImageUrl ? 2 : 3 }}>
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
              {amenities.slice(0, 3).map((amenity) => (
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
    </Surface>
  );
};

export default VenueCard;
