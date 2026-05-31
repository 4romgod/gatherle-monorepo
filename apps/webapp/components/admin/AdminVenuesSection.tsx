'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import {
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CreateVenueDocument,
  DeleteVenueByIdDocument,
  GetOrganizationsDocument,
  GetVenuesDocument,
  UpdateVenueDocument,
} from '@/data/graphql/query';
import { SortOrderInput, VenueType } from '@/data/graphql/types/graphql';
import type { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { useAppContext } from '@/hooks/useAppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  ADMIN_SURFACE_SX,
  AdminEmptyState,
  AdminListFooter,
  AdminListSearchField,
  AdminSectionHeader,
} from '@/components/admin/admin-ui';

type VenueFormState = {
  name: string;
  slug: string;
  type: VenueType;
  capacity: string;
  url: string;
  orgId: string;
  amenities: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

const PAGE_SIZE = 12;

const INITIAL_VENUE_STATE: VenueFormState = {
  name: '',
  slug: '',
  type: VenueType.Physical,
  capacity: '',
  url: '',
  orgId: '',
  amenities: '',
  street: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
};

function parseCommaSeparated(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildVenueQueryOptions(searchQuery: string, limit: number, skip = 0) {
  const trimmedQuery = searchQuery.trim();

  return {
    pagination: { limit, skip },
    sort: [{ field: 'name', order: SortOrderInput.Asc }],
    ...(trimmedQuery.length >= 2
      ? {
          search: {
            value: trimmedQuery,
            fields: ['name', 'slug', 'address.city', 'address.region', 'address.country', 'amenities'],
          },
        }
      : {}),
  };
}

function buildVenueAddress(input: VenueFormState) {
  const hasAnyAddressField = [input.street, input.city, input.region, input.postalCode, input.country].some((value) =>
    value.trim(),
  );

  if (!hasAnyAddressField) {
    return undefined;
  }

  if (!input.city.trim() || !input.country.trim()) {
    throw new Error('City and country are required when saving an address.');
  }

  return {
    street: input.street.trim() || undefined,
    city: input.city.trim(),
    region: input.region.trim() || undefined,
    postalCode: input.postalCode.trim() || undefined,
    country: input.country.trim(),
  };
}

function buildVenueFormState(venue: {
  name?: string | null;
  slug?: string | null;
  type?: VenueType | null;
  capacity?: number | null;
  url?: string | null;
  orgId?: string | null;
  amenities?: string[] | null;
  address?: {
    street?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}): VenueFormState {
  return {
    name: venue.name ?? '',
    slug: venue.slug ?? '',
    type: venue.type ?? VenueType.Physical,
    capacity: venue.capacity?.toString() ?? '',
    url: venue.url ?? '',
    orgId: venue.orgId ?? '',
    amenities: venue.amenities?.join(', ') ?? '',
    street: venue.address?.street ?? '',
    city: venue.address?.city ?? '',
    region: venue.address?.region ?? '',
    postalCode: venue.address?.postalCode ?? '',
    country: venue.address?.country ?? '',
  };
}

function formatVenueLocation(
  address?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  } | null,
) {
  return [address?.city, address?.region, address?.country].filter(Boolean).join(', ');
}

export default function AdminVenuesSection({ token }: AdminSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [formState, setFormState] = useState<Record<string, VenueFormState>>({});
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [savingVenueId, setSavingVenueId] = useState<string | null>(null);
  const [pendingDeleteVenue, setPendingDeleteVenue] = useState<{ venueId: string; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createState, setCreateState] = useState<VenueFormState>(INITIAL_VENUE_STATE);
  const [createLoading, setCreateLoading] = useState(false);

  const queryOptions = useMemo(
    () => buildVenueQueryOptions(debouncedSearchQuery, PAGE_SIZE, 0),
    [debouncedSearchQuery],
  );

  const { data, loading, error, refetch, fetchMore } = useQuery(GetVenuesDocument, {
    variables: {
      options: queryOptions,
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const { data: organizationsData } = useQuery(GetOrganizationsDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-first',
  });

  const venues = useMemo(() => data?.readVenues ?? [], [data]);
  const organizations = organizationsData?.readOrganizations ?? [];
  const editingVenue = editingVenueId ? (venues.find((venue) => venue.venueId === editingVenueId) ?? null) : null;
  const organizationNameMap = useMemo(
    () => new Map(organizations.map((organization) => [organization.orgId, organization.name])),
    [organizations],
  );

  const [createVenue] = useMutation(CreateVenueDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateVenue] = useMutation(UpdateVenueDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteVenue] = useMutation(DeleteVenueByIdDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setFormState((prev) => {
      let changed = false;
      const nextState = { ...prev };
      venues.forEach((venue) => {
        if (!nextState[venue.venueId]) {
          nextState[venue.venueId] = buildVenueFormState(venue);
          changed = true;
        }
      });
      return changed ? nextState : prev;
    });
  }, [venues]);

  useEffect(() => {
    if (!loading) {
      setHasMore(venues.length >= PAGE_SIZE);
    }
  }, [loading, venues.length]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshVenues = async () => {
    const requestedLimit = Math.max(venues.length, PAGE_SIZE);
    const result = await refetch({
      options: buildVenueQueryOptions(debouncedSearchQuery, requestedLimit, 0),
    });
    const refreshedItems = result.data?.readVenues ?? [];
    setHasMore(refreshedItems.length >= requestedLimit);
  };

  const openEditDialog = (venue: (typeof venues)[number]) => {
    setFormState((prev) => ({
      ...prev,
      [venue.venueId]: buildVenueFormState(venue),
    }));
    setEditingVenueId(venue.venueId);
  };

  const handleSaveVenue = async (venueId: string) => {
    const payload = formState[venueId];
    if (!payload?.name.trim()) {
      notify('Venue name is required.', 'error');
      return false;
    }

    setSavingVenueId(venueId);
    try {
      const address = buildVenueAddress(payload);
      await updateVenue({
        variables: {
          input: {
            venueId,
            name: payload.name.trim(),
            slug: payload.slug.trim() || undefined,
            type: payload.type,
            capacity: payload.capacity.trim() ? Number(payload.capacity) : undefined,
            url: payload.url.trim() || undefined,
            orgId: payload.orgId.trim() || undefined,
            amenities: parseCommaSeparated(payload.amenities),
            address,
          },
        },
      });
      await refreshVenues();
      notify('Venue updated.');
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update this venue.', 'error');
      return false;
    } finally {
      setSavingVenueId(null);
    }
  };

  const handleCreateVenue = async () => {
    if (!createState.name.trim()) {
      notify('Venue name is required.', 'error');
      return;
    }

    setCreateLoading(true);
    try {
      const address = buildVenueAddress(createState);
      await createVenue({
        variables: {
          input: {
            name: createState.name.trim(),
            slug: createState.slug.trim() || undefined,
            type: createState.type,
            capacity: createState.capacity.trim() ? Number(createState.capacity) : undefined,
            url: createState.url.trim() || undefined,
            orgId: createState.orgId.trim() || undefined,
            amenities: parseCommaSeparated(createState.amenities),
            address,
          },
        },
      });
      await refreshVenues();
      setCreateState(INITIAL_VENUE_STATE);
      setCreateDialogOpen(false);
      notify('Venue created.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to create this venue.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteVenue) {
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteVenue({
        variables: {
          venueId: pendingDeleteVenue.venueId,
        },
      });
      await refreshVenues();
      notify('Venue deleted.');
      setPendingDeleteVenue(null);
    } catch {
      notify('Unable to delete this venue.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    let nextBatchCount = 0;

    try {
      await fetchMore({
        variables: {
          options: buildVenueQueryOptions(debouncedSearchQuery, PAGE_SIZE, venues.length),
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const nextItems = fetchMoreResult?.readVenues ?? [];
          nextBatchCount = nextItems.length;

          if (nextItems.length === 0) {
            return previousResult;
          }

          return {
            ...previousResult,
            readVenues: [...(previousResult.readVenues ?? []), ...nextItems],
          };
        },
      });
      setHasMore(nextBatchCount === PAGE_SIZE);
    } catch {
      notify('Unable to load more venues.', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const infiniteScrollRef = useInfiniteScroll({
    enabled: hasMore,
    loading: loading || loadingMore,
    onEndReached: () => {
      void handleLoadMore();
    },
  });

  if (error) {
    return <Typography color="error">Unable to load venues right now.</Typography>;
  }

  return (
    <>
      <Stack spacing={3}>
        <AdminSectionHeader
          title="Venues"
          description="Correct venue metadata, update ownership, and keep operational location data usable."
          meta={
            <Chip size="small" label={debouncedSearchQuery ? `${venues.length} matches` : `${venues.length} loaded`} />
          }
          actions={
            <Button
              startIcon={<AddRoundedIcon />}
              variant="contained"
              size="small"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create venue
            </Button>
          }
        />

        <AdminListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search venues by name, slug, city, region, country, or amenity"
          helperText="Type at least 2 characters to narrow the venue list."
        />

        {loading && venues.length === 0 ? (
          <Stack spacing={2}>
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} variant="rounded" height={220} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : venues.length === 0 ? (
          <AdminEmptyState
            title={debouncedSearchQuery ? 'No matching venues' : 'No venues found'}
            description={
              debouncedSearchQuery
                ? 'Try a different venue name, slug, city, or amenity.'
                : 'Venues will appear here once they are created.'
            }
          />
        ) : (
          <Stack spacing={2}>
            {venues.map((venue) => {
              const orgName = venue.orgId ? organizationNameMap.get(venue.orgId) : null;
              const location = formatVenueLocation(venue.address);

              return (
                <Card key={venue.venueId} elevation={0} sx={ADMIN_SURFACE_SX}>
                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', lg: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', lg: 'center' }}
                        spacing={2}
                      >
                        <Stack spacing={0.75}>
                          <Typography variant="subtitle1" fontWeight={800}>
                            {venue.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /{venue.slug}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip size="small" variant="outlined" label={venue.type} />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={orgName ? `Org · ${orgName}` : 'No organization'}
                            />
                            {venue.capacity ? (
                              <Chip size="small" variant="outlined" label={`Capacity · ${venue.capacity}`} />
                            ) : null}
                          </Stack>
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', lg: 'auto' }}>
                          <Button
                            startIcon={<EditRoundedIcon />}
                            variant="outlined"
                            size="small"
                            onClick={() => openEditDialog(venue)}
                          >
                            Edit
                          </Button>
                          <Button
                            startIcon={<DeleteRoundedIcon />}
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => setPendingDeleteVenue({ venueId: venue.venueId, name: venue.name })}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>

                      <Stack spacing={0.75}>
                        {location ? (
                          <Typography variant="body2" color="text.secondary">
                            {location}
                          </Typography>
                        ) : null}
                        {venue.url ? (
                          <Typography variant="body2" color="text.secondary">
                            {venue.url}
                          </Typography>
                        ) : null}
                        {venue.amenities?.length ? (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {venue.amenities.slice(0, 4).map((amenity) => (
                              <Chip key={amenity} size="small" variant="outlined" label={amenity} />
                            ))}
                          </Stack>
                        ) : null}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}

            <AdminListFooter
              label="venue"
              loadedCount={venues.length}
              hasMore={hasMore}
              loadingMore={loadingMore}
              sentinelRef={infiniteScrollRef}
            />
          </Stack>
        )}
      </Stack>

      <Dialog
        open={Boolean(editingVenueId)}
        onClose={() => setEditingVenueId(null)}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 0, md: 2 },
            },
          },
        }}
      >
        <DialogTitle
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Stack spacing={0.6}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.12em' }}>
                Edit venue
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {editingVenue?.name ?? 'Venue'}
              </Typography>
            </Stack>
            <IconButton onClick={() => setEditingVenueId(null)} aria-label="Close edit venue">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          {editingVenueId && editingVenue ? (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Name"
                  value={formState[editingVenueId]?.name ?? editingVenue.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        name: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Slug"
                  value={formState[editingVenueId]?.slug ?? editingVenue.slug}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        slug: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Select
                  value={formState[editingVenueId]?.type ?? editingVenue.type}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        type: event.target.value as VenueType,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                >
                  {Object.values(VenueType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
                <TextField
                  label="Capacity"
                  value={formState[editingVenueId]?.capacity ?? editingVenue.capacity?.toString() ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        capacity: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <Select
                  value={formState[editingVenueId]?.orgId ?? editingVenue.orgId ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        orgId: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">No organization</MenuItem>
                  {organizations.map((organization) => (
                    <MenuItem key={organization.orgId} value={organization.orgId}>
                      {organization.name}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Website / URL"
                  value={formState[editingVenueId]?.url ?? editingVenue.url ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        url: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Amenities"
                  value={formState[editingVenueId]?.amenities ?? editingVenue.amenities?.join(', ') ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        amenities: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </Stack>

              <TextField
                label="Street"
                value={formState[editingVenueId]?.street ?? editingVenue.address?.street ?? ''}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    [editingVenueId]: {
                      ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                      street: event.target.value,
                    },
                  }))
                }
                size="small"
                fullWidth
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="City"
                  value={formState[editingVenueId]?.city ?? editingVenue.address?.city ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        city: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Region / State"
                  value={formState[editingVenueId]?.region ?? editingVenue.address?.region ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        region: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Postal code"
                  value={formState[editingVenueId]?.postalCode ?? editingVenue.address?.postalCode ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        postalCode: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Country"
                  value={formState[editingVenueId]?.country ?? editingVenue.address?.country ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingVenueId]: {
                        ...(prev[editingVenueId] ?? buildVenueFormState(editingVenue)),
                        country: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => setEditingVenueId(null)} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button
                  startIcon={savingVenueId === editingVenueId ? <CircularProgress size={16} /> : <SaveRoundedIcon />}
                  variant="contained"
                  onClick={async () => {
                    const success = await handleSaveVenue(editingVenueId);
                    if (success) {
                      setEditingVenueId(null);
                    }
                  }}
                  disabled={savingVenueId === editingVenueId}
                  fullWidth={isMobile}
                >
                  {savingVenueId === editingVenueId ? 'Saving…' : 'Save venue'}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 0, md: 2 },
            },
          },
        }}
      >
        <DialogTitle
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Stack spacing={0.6}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.12em' }}>
                Create venue
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                New venue
              </Typography>
            </Stack>
            <IconButton onClick={() => setCreateDialogOpen(false)} aria-label="Close create venue">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={createState.name}
              onChange={(event) => setCreateState((prev) => ({ ...prev, name: event.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Slug"
              value={createState.slug}
              onChange={(event) => setCreateState((prev) => ({ ...prev, slug: event.target.value }))}
              size="small"
              fullWidth
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Select
                value={createState.type}
                onChange={(event) => setCreateState((prev) => ({ ...prev, type: event.target.value as VenueType }))}
                size="small"
                fullWidth
              >
                {Object.values(VenueType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label="Capacity"
                value={createState.capacity}
                onChange={(event) => setCreateState((prev) => ({ ...prev, capacity: event.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Select
                value={createState.orgId}
                onChange={(event) => setCreateState((prev) => ({ ...prev, orgId: event.target.value }))}
                size="small"
                displayEmpty
                fullWidth
              >
                <MenuItem value="">No organization</MenuItem>
                {organizations.map((organization) => (
                  <MenuItem key={organization.orgId} value={organization.orgId}>
                    {organization.name}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label="Website / URL"
                value={createState.url}
                onChange={(event) => setCreateState((prev) => ({ ...prev, url: event.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              label="Amenities"
              value={createState.amenities}
              onChange={(event) => setCreateState((prev) => ({ ...prev, amenities: event.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Street"
              value={createState.street}
              onChange={(event) => setCreateState((prev) => ({ ...prev, street: event.target.value }))}
              size="small"
              fullWidth
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="City"
                value={createState.city}
                onChange={(event) => setCreateState((prev) => ({ ...prev, city: event.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Region / State"
                value={createState.region}
                onChange={(event) => setCreateState((prev) => ({ ...prev, region: event.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Postal code"
                value={createState.postalCode}
                onChange={(event) => setCreateState((prev) => ({ ...prev, postalCode: event.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Country"
                value={createState.country}
                onChange={(event) => setCreateState((prev) => ({ ...prev, country: event.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => setCreateDialogOpen(false)} fullWidth={isMobile}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={() => void handleCreateVenue()}
                disabled={createLoading}
                fullWidth={isMobile}
              >
                {createLoading ? 'Creating…' : 'Create venue'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteVenue)}
        title={`Delete ${pendingDeleteVenue?.name ?? 'this venue'}?`}
        description="This removes the venue record from the platform."
        confirmLabel="Delete venue"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteVenue(null)}
        loading={confirmLoading}
      />
    </>
  );
}
