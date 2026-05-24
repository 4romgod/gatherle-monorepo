import Link from 'next/link';
import { Avatar, Box, Card, Chip, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ROUTES } from '@/lib/constants';
import Surface from '@/components/core/Surface';
import RemoteImage from '@/components/core/RemoteImage';

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

const VenueCard = ({ venueId, name, type, capacity, address, slug, images, featuredImageUrl }: VenueCardProps) => {
  const addressLabel = [address?.city, address?.region, address?.country].filter(Boolean).join(', ');
  const heroImageUrl = featuredImageUrl ?? images?.[0];
  const detailsHref = slug
    ? ROUTES.VENUES.VENUE(slug)
    : venueId
      ? `${ROUTES.VENUES.ROOT}/${venueId}`
      : ROUTES.VENUES.ROOT;

  return (
    <Surface
      disableShadow
      sx={{
        borderRadius: 2,
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        component={Link}
        href={detailsHref}
        sx={{
          alignItems: 'center',
          color: 'inherit',
          display: 'flex',
          gap: 1.5,
          minWidth: 0,
          p: 1.75,
          textDecoration: 'none',
          width: '100%',
        }}
      >
        <RemoteImage
          alt={name ?? 'Venue image'}
          fallback={
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2.25,
                color: 'primary.main',
                height: 72,
                width: 72,
              }}
            >
              <LocationOnIcon fontSize="small" />
            </Avatar>
          }
          src={heroImageUrl}
          sx={{
            bgcolor: 'action.hover',
            borderRadius: 1.25,
            flexShrink: 0,
            height: 72,
            width: 72,
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800} noWrap variant="subtitle1">
            {name ?? 'Unnamed space'}
          </Typography>
          <Typography color="text.secondary" fontWeight={700} noWrap variant="caption">
            {type ?? 'Venue'}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5, minWidth: 0 }}>
            <LocationOnIcon sx={{ color: 'text.secondary', flexShrink: 0, fontSize: 16 }} />
            <Typography color="text.secondary" noWrap variant="body2">
              {addressLabel || 'Address details coming soon'}
            </Typography>
          </Stack>
        </Box>

        <Stack spacing={1} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          {capacity && (
            <Chip
              icon={<PeopleIcon />}
              label={`${capacity.toLocaleString()} cap`}
              size="small"
              sx={{ bgcolor: 'action.hover', color: 'primary.main', fontWeight: 800 }}
            />
          )}
          <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        </Stack>
      </Box>
    </Surface>
  );
};

export default VenueCard;
