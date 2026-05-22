'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { UpdateVenueDocument } from '@/data/graphql/mutation/Venue/mutation';
import { GetVenueBySlugDocument, GetVenuesDocument } from '@/data/graphql/query';
import {
  MediaEntityType,
  MediaType,
  type GetVenueBySlugQuery,
  type UpdateVenueInput,
  VenueType,
} from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useVenueManagementAccess } from '@/hooks/useVenueManagementAccess';

type FormState = {
  name: string;
  type: VenueType;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  url: string;
  capacity: string;
  amenities: string;
};

type Venue = NonNullable<GetVenueBySlugQuery['readVenueBySlug']>;

const toFormState = (venue: Venue): FormState => ({
  name: venue.name ?? '',
  type: venue.type ?? VenueType.Physical,
  street: venue.address?.street ?? '',
  city: venue.address?.city ?? '',
  region: venue.address?.region ?? '',
  postalCode: venue.address?.postalCode ?? '',
  country: venue.address?.country ?? '',
  url: venue.url ?? '',
  capacity: venue.capacity ? String(venue.capacity) : '',
  amenities: venue.amenities?.join(', ') ?? '',
});

function useVenueQuery(slug: string) {
  const query = useQuery(GetVenueBySlugDocument, {
    variables: { slug },
    fetchPolicy: 'cache-and-network',
  });

  return {
    ...query,
    venue: query.data?.readVenueBySlug ?? null,
  };
}

type VenueEditFormProps = {
  slug: string;
  token?: string | null;
};

export default function VenueEditForm({ slug, token }: VenueEditFormProps) {
  const router = useRouter();
  const { canManageVenue, loading: accessLoading } = useVenueManagementAccess();
  const { venue, loading, error } = useVenueQuery(slug);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [featuredReadUrl, setFeaturedReadUrl] = useState<string | null>(null);

  const displayState = useMemo(() => {
    if (formState) return formState;
    return venue ? toFormState(venue) : null;
  }, [formState, venue]);

  const {
    upload: uploadFeaturedImage,
    uploading: featuredImageUploading,
    error: featuredImageError,
    preview: featuredImagePreview,
    reset: resetFeaturedImage,
  } = useMediaUpload({
    entityType: MediaEntityType.Venue,
    mediaType: MediaType.Featured,
    entityId: venue?.venueId,
  });

  const [updateVenue, { loading: saving, error: mutationError }] = useMutation(UpdateVenueDocument, {
    context: { headers: getAuthHeader(token) },
    refetchQueries: [{ query: GetVenuesDocument }, { query: GetVenueBySlugDocument, variables: { slug } }],
    awaitRefetchQueries: true,
  });

  const requiresAddress = displayState?.type !== VenueType.Virtual;

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormState((current) => ({ ...(current ?? displayState!), [field]: value }));
    };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((current) => ({ ...(current ?? displayState!), type: event.target.value as VenueType }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!venue || !displayState) return;

    const trimmedName = displayState.name.trim();
    const trimmedCity = displayState.city.trim();
    const trimmedCountry = displayState.country.trim();
    const trimmedStreet = displayState.street.trim();
    const trimmedRegion = displayState.region.trim();
    const trimmedPostal = displayState.postalCode.trim();
    const trimmedUrl = displayState.url.trim();
    const trimmedAmenities = displayState.amenities.trim();

    const validationErrors: Record<string, string> = {};
    if (!trimmedName) validationErrors.name = 'Venue name is required';
    if (requiresAddress && !trimmedCity) validationErrors.city = 'City is required for physical/hybrid venues';
    if (requiresAddress && !trimmedCountry) validationErrors.country = 'Country is required for physical/hybrid venues';

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const input: UpdateVenueInput = {
      venueId: venue.venueId,
      name: trimmedName,
      type: displayState.type,
    };

    if (venue.orgId) input.orgId = venue.orgId;
    if (trimmedUrl) input.url = trimmedUrl;

    const capacityNumber = Number(displayState.capacity);
    if (!Number.isNaN(capacityNumber) && capacityNumber > 0) input.capacity = capacityNumber;

    const amenitiesArray = trimmedAmenities
      ? trimmedAmenities
          .split(',')
          .map((amenity) => amenity.trim())
          .filter(Boolean)
      : [];
    input.amenities = amenitiesArray;

    if (displayState.type === VenueType.Virtual) {
      input.address = null;
    } else if (trimmedCity && trimmedCountry) {
      input.address = {
        street: trimmedStreet || undefined,
        city: trimmedCity,
        region: trimmedRegion || undefined,
        postalCode: trimmedPostal || undefined,
        country: trimmedCountry,
      };
    }

    if (featuredReadUrl) input.featuredImageUrl = featuredReadUrl;

    try {
      const response = await updateVenue({ variables: { input } });
      const updatedVenue = response.data?.updateVenue;
      router.push(ROUTES.VENUES.VENUE(updatedVenue?.slug ?? slug));
    } catch (submitError) {
      logger.error('Failed to update venue', submitError);
    }
  };

  if (loading || accessLoading || !displayState) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Container>
    );
  }

  if (error || !venue) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="error">Unable to load this venue right now.</Typography>
      </Container>
    );
  }

  if (!canManageVenue(venue.orgId)) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="warning">
          Only Gatherle admins and linked organization owners/admins can edit this venue.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: { xs: 2.5, md: 4 } }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="overline" color="primary" fontWeight={800} sx={{ letterSpacing: '0.1em' }}>
                Venue
              </Typography>
              <Typography variant="h4" fontWeight={900}>
                Edit {venue.name}
              </Typography>
              <Typography color="text.secondary">Keep venue master data accurate for every linked event.</Typography>
            </Stack>

            {mutationError && <Alert severity="error">{mutationError.message}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Venue name"
                  value={displayState.name}
                  onChange={handleChange('name')}
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                  size="small"
                  color="secondary"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Type"
                  value={displayState.type}
                  onChange={handleTypeChange}
                  size="small"
                  color="secondary"
                >
                  {Object.values(VenueType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Venue website or landing page"
                  value={displayState.url}
                  onChange={handleChange('url')}
                  size="small"
                  color="secondary"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Street address"
                  value={displayState.street}
                  onChange={handleChange('street')}
                  size="small"
                  color="secondary"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label={requiresAddress ? 'City *' : 'City'}
                  value={displayState.city}
                  onChange={handleChange('city')}
                  size="small"
                  color="secondary"
                  error={Boolean(errors.city)}
                  helperText={errors.city}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label={requiresAddress ? 'Country *' : 'Country'}
                  value={displayState.country}
                  onChange={handleChange('country')}
                  size="small"
                  color="secondary"
                  error={Boolean(errors.country)}
                  helperText={errors.country}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="State / province"
                  value={displayState.region}
                  onChange={handleChange('region')}
                  size="small"
                  color="secondary"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Postal / ZIP"
                  value={displayState.postalCode}
                  onChange={handleChange('postalCode')}
                  size="small"
                  color="secondary"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={displayState.capacity}
                  onChange={handleChange('capacity')}
                  size="small"
                  color="secondary"
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Amenities (comma separated)"
              value={displayState.amenities}
              onChange={handleChange('amenities')}
              size="small"
              color="secondary"
              helperText="Examples: sound system, bar, outdoor patio"
            />

            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Featured image
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  disabled={featuredImageUploading}
                  startIcon={featuredImageUploading ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {featuredImageUploading ? 'Uploading...' : 'Change image'}
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      e.target.value = '';
                      try {
                        const readUrl = await uploadFeaturedImage(file);
                        setFeaturedReadUrl(readUrl);
                      } catch {
                        // error shown below
                      }
                    }}
                  />
                </Button>
                {(featuredReadUrl || featuredImagePreview) && !featuredImageUploading && (
                  <Button
                    size="small"
                    color="secondary"
                    onClick={() => {
                      setFeaturedReadUrl(null);
                      resetFeaturedImage();
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
              {featuredImageError && (
                <Typography variant="caption" color="error">
                  {featuredImageError}
                </Typography>
              )}
              {(featuredImagePreview || featuredReadUrl || venue.featuredImageUrl) && (
                <Box
                  component="img"
                  src={featuredImagePreview || featuredReadUrl || venue.featuredImageUrl || undefined}
                  alt="Featured venue preview"
                  sx={{
                    width: 220,
                    height: 130,
                    borderRadius: 2,
                    objectFit: 'cover',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              )}
            </Stack>

            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" gap={1.5}>
              <Button component={Link} href={ROUTES.VENUES.VENUE(slug)} variant="outlined" color="secondary">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || featuredImageUploading || !token}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {saving ? 'Saving...' : 'Save venue'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
