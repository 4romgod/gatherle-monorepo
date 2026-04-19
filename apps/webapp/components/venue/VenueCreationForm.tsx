'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import { MediaEntityType, MediaType } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { ROUTES } from '@/lib/constants';
import { logger } from '@/lib/utils';
import { usePersistentState } from '@/hooks';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { STORAGE_KEYS, STORAGE_NAMESPACES } from '@/hooks/usePersistentState';
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
  } = usePersistentState<FormState>(STORAGE_KEYS.VENUE_CREATION_FORM, defaultFormState, {
    namespace: STORAGE_NAMESPACES.VENUE_MUTATION,
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
  const [featuredReadUrl, setFeaturedReadUrl] = useState<string | null>(null);

  const {
    upload: uploadFeaturedImage,
    uploading: featuredImageUploading,
    error: featuredImageError,
    preview: featuredImagePreview,
    reset: resetFeaturedImage,
  } = useMediaUpload({
    entityType: MediaEntityType.Venue,
    mediaType: MediaType.Featured,
  });

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

    if (featuredReadUrl) {
      input.featuredImageUrl = featuredReadUrl;
    }

    try {
      const response = await createVenue({ variables: { input } });
      const createdVenue = response.data?.createVenue;
      if (createdVenue) {
        setSuccessMessage(`"${createdVenue.name}" is now part of the venue catalog.`);
        setSuccessSlug(createdVenue.slug ?? null);
        clearStorage();
        setErrors({});
        setFeaturedReadUrl(null);
        resetFeaturedImage();
      }
    } catch (error) {
      logger.error('Failed to create venue', error);
    }
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

            {/* Featured image upload */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>
                Featured image
              </Typography>
              <Typography color="text.secondary" variant="body2">
                A cover photo that appears on the venue profile and event pages.
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  disabled={featuredImageUploading}
                  startIcon={featuredImageUploading ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  {featuredImageUploading ? 'Uploading…' : featuredReadUrl ? 'Change image' : 'Select featured image'}
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
                        // error shown via featuredImageError below
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
              {(featuredImagePreview || featuredReadUrl) && (
                <Box
                  component="img"
                  src={featuredImagePreview || featuredReadUrl || undefined}
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
                  disabled={loading || featuredImageUploading || !token}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {loading ? 'Creating…' : featuredImageUploading ? 'Uploading image…' : 'Create venue'}
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
