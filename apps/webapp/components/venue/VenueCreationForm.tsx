'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CreateVenueDocument } from '@/data/graphql/mutation/Venue/mutation';
import { GetAllVenuesDocument } from '@/data/graphql/query';
import { CreateVenueInput, VenueType } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';
import { usePersistentState } from '@/hooks';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

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

const defaultFormState: FormState = {
  name: '',
  type: VenueType.Physical,
  street: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  url: '',
  capacity: '',
  amenities: '',
};

type VenueCreationFormProps = {
  token?: string | null;
  defaultOrgId?: string | null;
};

export default function VenueCreationForm({ token, defaultOrgId }: VenueCreationFormProps) {
  const { data: sessionData, status: sessionStatus } = useSession();
  const userId = sessionData?.user?.userId;

  const {
    value: formState,
    setValue: setFormState,
    clearStorage,
    isHydrated,
  } = usePersistentState<FormState>('venue-creation-form', defaultFormState, {
    namespace: 'venue-mutation',
    userId,
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    disabled: sessionStatus === 'unauthenticated',
    syncToBackend: false,
  });

  // Use default state until hydration completes to prevent hydration mismatch
  const displayState = isHydrated ? formState : defaultFormState;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDiscardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const featuredImageUrlRef = useRef<string | null>(null);
  const galleryPreviewsRef = useRef<string[]>([]);

  const requiresAddress = useMemo(() => displayState.type !== VenueType.Virtual, [displayState.type]);

  const [createVenue, { loading, error: mutationError }] = useMutation(CreateVenueDocument, {
    context: { headers: getAuthHeader(token) },
    refetchQueries: [{ query: GetAllVenuesDocument }],
    awaitRefetchQueries: true,
  });

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, type: event.target.value as VenueType }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formState.name.trim();
    const trimmedCity = formState.city.trim();
    const trimmedCountry = formState.country.trim();
    const trimmedStreet = formState.street.trim();
    const trimmedRegion = formState.region.trim();
    const trimmedPostal = formState.postalCode.trim();
    const trimmedUrl = formState.url.trim();
    const trimmedAmenities = formState.amenities.trim();

    const validationErrors: Record<string, string> = {};
    if (!trimmedName) validationErrors.name = 'Venue name is required';
    if (requiresAddress && !trimmedCity) validationErrors.city = 'City is required for physical/hybrid venues';
    if (requiresAddress && !trimmedCountry) validationErrors.country = 'Country is required for physical/hybrid venues';

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const input: CreateVenueInput = {
      name: trimmedName,
      type: formState.type,
    };

    if (defaultOrgId) {
      input.orgId = defaultOrgId;
    }

    if (trimmedUrl) {
      input.url = trimmedUrl;
    }

    const capacityNumber = Number(formState.capacity);
    if (!Number.isNaN(capacityNumber) && capacityNumber > 0) {
      input.capacity = capacityNumber;
    }

    const amenitiesArray = trimmedAmenities
      ? trimmedAmenities
          .split(',')
          .map((amenity) => amenity.trim())
          .filter(Boolean)
      : [];
    if (amenitiesArray.length > 0) {
      input.amenities = amenitiesArray;
    }

    if (trimmedCity && trimmedCountry) {
      input.address = {
        street: trimmedStreet || undefined,
        city: trimmedCity,
        region: trimmedRegion || undefined,
        postalCode: trimmedPostal || undefined,
        country: trimmedCountry,
      };
    }

    try {
      const response = await createVenue({ variables: { input } });
      const createdVenue = response.data?.createVenue;
      if (createdVenue) {
        setSuccessMessage(`"${createdVenue.name}" is now part of the venue catalog.`);
        setSuccessSlug(createdVenue.slug ?? null);
        clearStorage();
        setErrors({});
      }
    } catch (error) {
      logger.error('Failed to create venue', error);
    }
  };

  const handleFeaturedImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (featuredImageUrlRef.current) {
        URL.revokeObjectURL(featuredImageUrlRef.current);
        featuredImageUrlRef.current = null;
      }
      setFeaturedImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    if (featuredImageUrlRef.current) {
      URL.revokeObjectURL(featuredImageUrlRef.current);
    }
    featuredImageUrlRef.current = url;
    setFeaturedImagePreview(url);
    event.target.value = '';
  };

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    const previews = [...galleryPreviewsRef.current, ...newPreviews];
    galleryPreviewsRef.current = previews;
    setGalleryPreviews(previews);
    event.target.value = '';
  };

  const clearFeaturedImage = () => {
    if (featuredImageUrlRef.current) {
      URL.revokeObjectURL(featuredImageUrlRef.current);
      featuredImageUrlRef.current = null;
    }
    setFeaturedImagePreview(null);
  };

  const clearGalleryImages = () => {
    galleryPreviewsRef.current.forEach((prev) => URL.revokeObjectURL(prev));
    galleryPreviewsRef.current = [];
    setGalleryPreviews([]);
  };

  const handleDiscardDraft = () => {
    setDiscardDialogOpen(true);
  };

  const confirmDiscardDraft = () => {
    clearStorage();
    setErrors({});
    setDiscardDialogOpen(false);
  };

  const cancelDiscard = () => {
    setDiscardDialogOpen(false);
  };

  useEffect(() => {
    return () => {
      if (featuredImageUrlRef.current) {
        URL.revokeObjectURL(featuredImageUrlRef.current);
      }
      galleryPreviewsRef.current.forEach((prev) => URL.revokeObjectURL(prev));
    };
  }, []);

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 2.5, md: 4 },
        }}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {successMessage && (
              <Alert
                severity="success"
                action={
                  successSlug ? (
                    <Button component={Link} href={ROUTES.VENUES.VENUE(successSlug)} size="small" variant="outlined">
                      View venue
                    </Button>
                  ) : undefined
                }
              >
                {successMessage}
              </Alert>
            )}

            {mutationError && <Alert severity="error">{mutationError.message}</Alert>}

            <Stack spacing={1}>
              <Typography variant="h6" fontWeight={700}>
                Share venue details
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Fill in the key details so the venue can be linked to events everywhere on the platform.
              </Typography>
            </Stack>

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
                  inputProps={{ min: 0 }}
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

            {/* TODO Update this when image upload is implemented */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>
                Upload preview photos
              </Typography>
              <Typography color="text.secondary" variant="body2">
                You can choose a featured image and additional gallery shots now; we will hook up S3 + Mongo storage in
                a later sprint, so these files currently stay client-side only.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button component="label" variant="outlined" size="small">
                      Select featured image
                      <input type="file" hidden accept="image/*" onChange={handleFeaturedImageChange} />
                    </Button>
                    <Button size="small" color="secondary" onClick={clearFeaturedImage}>
                      Clear
                    </Button>
                  </Stack>
                  {featuredImagePreview && (
                    <Box
                      component="img"
                      src={featuredImagePreview}
                      alt="Featured venue preview"
                      sx={{
                        width: 200,
                        height: 120,
                        borderRadius: 2,
                        mt: 1,
                        objectFit: 'cover',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button component="label" variant="outlined" size="small">
                      Add gallery images
                      <input type="file" hidden accept="image/*" multiple onChange={handleGalleryChange} />
                    </Button>
                    <Button size="small" color="secondary" onClick={clearGalleryImages}>
                      Clear
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    {galleryPreviews.map((preview) => (
                      <Box
                        key={preview}
                        component="img"
                        src={preview}
                        alt="Venue gallery preview"
                        sx={{
                          width: 120,
                          height: 80,
                          borderRadius: 2,
                          objectFit: 'cover',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Typography color="text.secondary" variant="body2" sx={{ flex: 1 }}>
                Venues power the location experience for events, and maps. Keep the data accurate so every event can
                reuse it.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="outlined" color="secondary" onClick={handleDiscardDraft} disabled={loading}>
                  Discard draft
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !token}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {loading ? 'Creating…' : 'Create venue'}
                </Button>
              </Stack>
            </Stack>

            {!token && (
              <Alert severity="warning">
                Sign in with an admin account to save venues.{' '}
                <Link href={ROUTES.AUTH.LOGIN} style={{ fontWeight: 600 }}>
                  Sign in
                </Link>
              </Alert>
            )}
          </Stack>
        </Box>
      </Paper>
      <ConfirmDialog
        open={isDiscardDialogOpen}
        title="Discard venue draft?"
        description="Discarding will remove the saved draft from this browser. You can always start again from scratch."
        confirmLabel="Discard"
        onConfirm={confirmDiscardDraft}
        onCancel={cancelDiscard}
      />
    </>
  );
}
