import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  CreateVenueDocument,
  DeleteVenueByIdDocument,
  UpdateVenueDocument,
} from '@data/graphql/mutation/Venue/mutation';
import { GetOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { GetVenuesDocument } from '@data/graphql/query/Venue/query';
import { VenueType } from '@data/graphql/types/graphql';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { getApolloAuthContext } from '@/lib/auth';
import {
  ADMIN_PAGE_SIZE,
  buildAdminOrganizationQueryOptions,
  buildAdminVenueQueryOptions,
  parseCommaSeparated,
} from '@/lib/admin/queryOptions';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminListFooter } from '@/components/admin/AdminListFooter';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminPill } from '@/components/admin/AdminPill';
import { InlineButton } from '@/components/core/InlineButton';
import { typography } from '@/app/theme/typography';

type VenueFormState = {
  amenities: string;
  capacity: string;
  city: string;
  country: string;
  name: string;
  orgId: string;
  postalCode: string;
  region: string;
  slug: string;
  street: string;
  type: VenueType;
  url: string;
};

const VENUE_TYPES = [VenueType.Physical, VenueType.Virtual, VenueType.Hybrid];
const INITIAL_VENUE_FORM: VenueFormState = {
  amenities: '',
  capacity: '',
  city: '',
  country: '',
  name: '',
  orgId: '',
  postalCode: '',
  region: '',
  slug: '',
  street: '',
  type: VenueType.Physical,
  url: '',
};

function buildVenueFormState(venue: {
  address?: {
    city?: string | null;
    country?: string | null;
    postalCode?: string | null;
    region?: string | null;
    street?: string | null;
  } | null;
  amenities?: string[] | null;
  capacity?: number | null;
  name?: string | null;
  orgId?: string | null;
  slug?: string | null;
  type?: VenueType | null;
  url?: string | null;
}): VenueFormState {
  return {
    amenities: venue.amenities?.join(', ') ?? '',
    capacity: venue.capacity != null ? String(venue.capacity) : '',
    city: venue.address?.city ?? '',
    country: venue.address?.country ?? '',
    name: venue.name ?? '',
    orgId: venue.orgId ?? '',
    postalCode: venue.address?.postalCode ?? '',
    region: venue.address?.region ?? '',
    slug: venue.slug ?? '',
    street: venue.address?.street ?? '',
    type: venue.type ?? VenueType.Physical,
    url: venue.url ?? '',
  };
}

function buildVenueAddress(formState: VenueFormState) {
  const hasAddress = [formState.street, formState.city, formState.region, formState.postalCode, formState.country].some(
    (value) => value.trim(),
  );

  if (!hasAddress) {
    return undefined;
  }

  if (!formState.city.trim() || !formState.country.trim()) {
    throw new Error('City and country are required when saving a venue address.');
  }

  return {
    city: formState.city.trim(),
    country: formState.country.trim(),
    postalCode: formState.postalCode.trim() || undefined,
    region: formState.region.trim() || undefined,
    street: formState.street.trim() || undefined,
  };
}

function formatVenueLocation(venue: {
  address?: {
    city?: string | null;
    country?: string | null;
    region?: string | null;
  } | null;
}) {
  return [venue.address?.city, venue.address?.region, venue.address?.country].filter(Boolean).join(', ');
}

export function AdminVenuesScreen() {
  const { showToast } = useAppFeedback();
  const { authToken, isAdmin, isAuthenticated, loading: accessLoading, refetch: refetchAdminAccess } = useAdminAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [orgPickerQuery, setOrgPickerQuery] = useState('');
  const [debouncedOrgPickerQuery, setDebouncedOrgPickerQuery] = useState('');
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formState, setFormState] = useState<VenueFormState>(INITIAL_VENUE_FORM);
  const [savingVenueId, setSavingVenueId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const venuesQuery = useQuery(GetVenuesDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      options: buildAdminVenueQueryOptions(debouncedSearchQuery, ADMIN_PAGE_SIZE, 0),
    },
    ...getApolloAuthContext(authToken),
  });
  const organizationsQuery = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      options: buildAdminOrganizationQueryOptions(debouncedOrgPickerQuery, 100, 0),
    },
    ...getApolloAuthContext(authToken),
  });

  const venues = venuesQuery.data?.readVenues ?? [];
  const organizations = organizationsQuery.data?.readOrganizations ?? [];
  const organizationNameMap = useMemo(
    () => new Map(organizations.map((organization) => [organization.orgId, organization.name])),
    [organizations],
  );
  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.venueId === editingVenueId) ?? null,
    [editingVenueId, venues],
  );

  const [createVenue] = useMutation(CreateVenueDocument, getApolloAuthContext(authToken));
  const [updateVenue] = useMutation(UpdateVenueDocument, getApolloAuthContext(authToken));
  const [deleteVenueById] = useMutation(DeleteVenueByIdDocument, getApolloAuthContext(authToken));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedOrgPickerQuery(orgPickerQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [orgPickerQuery]);

  useEffect(() => {
    if (!venuesQuery.loading) {
      setHasMore(venues.length >= ADMIN_PAGE_SIZE);
    }
  }, [venues.length, venuesQuery.loading]);

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([
      refetchAdminAccess(),
      venuesQuery.refetch({
        options: buildAdminVenueQueryOptions(debouncedSearchQuery, Math.max(venues.length, ADMIN_PAGE_SIZE), 0),
      }),
      organizationsQuery.refetch({
        options: buildAdminOrganizationQueryOptions(debouncedOrgPickerQuery, 100, 0),
      }),
    ]);
  };

  const { onRefresh, refreshing } = usePullToRefresh(refreshAll);

  const loadMore = async () => {
    if (venuesQuery.loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    let nextBatchCount = 0;

    try {
      await venuesQuery.fetchMore({
        variables: {
          options: buildAdminVenueQueryOptions(debouncedSearchQuery, ADMIN_PAGE_SIZE, venues.length),
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

      setHasMore(nextBatchCount === ADMIN_PAGE_SIZE);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't load more venues.",
        tone: 'error',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const infiniteScroll = useInfiniteScroll({
    enabled: hasMore,
    loading: venuesQuery.loading || loadingMore,
    onEndReached: loadMore,
    resetKey: `${debouncedSearchQuery}:${venues.length}`,
  });

  const openCreateModal = () => {
    setCreating(true);
    setEditingVenueId(null);
    setFormState(INITIAL_VENUE_FORM);
    setOrgPickerQuery('');
  };

  const openEditModal = (venueId: string) => {
    const venue = venues.find((entry) => entry.venueId === venueId);
    if (!venue) {
      return;
    }

    setCreating(false);
    setEditingVenueId(venueId);
    setFormState(buildVenueFormState(venue));
    setOrgPickerQuery('');
  };

  const closeModal = () => {
    setCreating(false);
    setEditingVenueId(null);
    setOrgPickerQuery('');
  };

  const saveVenue = async () => {
    if (!formState.name.trim()) {
      showToast({ message: 'Venue name is required.', tone: 'error' });
      return;
    }

    const nextSavingId = editingVenueId ?? 'create';
    setSavingVenueId(nextSavingId);
    try {
      const address = buildVenueAddress(formState);
      const payload = {
        address,
        amenities: parseCommaSeparated(formState.amenities),
        capacity: formState.capacity.trim() ? Number(formState.capacity) : undefined,
        name: formState.name.trim(),
        orgId: formState.orgId.trim() || undefined,
        slug: formState.slug.trim() || undefined,
        type: formState.type,
        url: formState.url.trim() || undefined,
      };

      if (editingVenueId) {
        await updateVenue({
          variables: {
            input: {
              ...payload,
              venueId: editingVenueId,
            },
          },
        });
      } else {
        await createVenue({
          variables: {
            input: payload,
          },
        });
      }

      await refreshAll();
      closeModal();
      showToast({ message: editingVenueId ? 'Venue saved.' : 'Venue created.', tone: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save this venue.",
        tone: 'error',
      });
    } finally {
      setSavingVenueId(null);
    }
  };

  const confirmDelete = (venueId: string, name: string) => {
    Alert.alert('Delete venue', `Delete ${name}? This action cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void (async () => {
            try {
              await deleteVenueById({ variables: { venueId } });
              await refreshAll();
              showToast({ message: 'Venue deleted.', tone: 'success' });
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't delete this venue.",
                tone: 'error',
              });
            }
          })();
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <StateNotice message="Sign in with a Gatherle admin account to manage venues." />
      </PageContainer>
    );
  }

  if (accessLoading && !isAdmin) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice message="Checking your admin access..." />
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <StateNotice message="Only Gatherle admins can manage venues." />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer
        onContentSizeChange={infiniteScroll.onContentSizeChange}
        onRefresh={onRefresh}
        onScroll={infiniteScroll.onScroll}
        refreshing={refreshing}
        scrollEventThrottle={infiniteScroll.scrollEventThrottle}
      >
        <View style={styles.section}>
          <SectionHeading actionLabel="Create" onPressAction={openCreateModal} title="Venues" />
          <SearchField
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search name, slug, city, region, country, or amenities"
            value={searchQuery}
          />
        </View>

        {(venuesQuery.error || organizationsQuery.error) && venues.length === 0 ? (
          <StateNotice actionLabel="Retry" message="We couldn’t load venues." onPressAction={() => void refreshAll()} />
        ) : venuesQuery.loading && venues.length === 0 ? (
          <AdminEntityListSkeleton />
        ) : venues.length === 0 ? (
          <StateNotice
            message={debouncedSearchQuery ? 'No matching venues for that search.' : 'No venues are available yet.'}
          />
        ) : (
          <View style={styles.list}>
            {venues.map((venue) => (
              <AdminEntityCard
                key={venue.venueId}
                actions={
                  <View style={styles.actionRow}>
                    <InlineButton compact label="Edit" onPress={() => openEditModal(venue.venueId)} tone="secondary" />
                    <InlineButton
                      compact
                      label="Delete"
                      onPress={() => confirmDelete(venue.venueId, venue.name)}
                      tone="primary"
                    />
                  </View>
                }
                description={venue.url ?? undefined}
                meta={
                  <>
                    <AdminPill label={`Type · ${venue.type}`} tone="primary" />
                    {venue.capacity != null ? (
                      <AdminPill label={`Capacity · ${venue.capacity}`} tone="success" />
                    ) : null}
                    {venue.orgId ? (
                      <AdminPill
                        label={`Org · ${organizationNameMap.get(venue.orgId) ?? venue.orgId.slice(0, 8)}`}
                        tone="default"
                      />
                    ) : (
                      <AdminPill label="Standalone" tone="default" />
                    )}
                  </>
                }
                subtitle={formatVenueLocation(venue) || `/${venue.slug}`}
                title={venue.name}
              >
                {venue.amenities?.length ? (
                  <Text style={styles.metaText}>Amenities: {venue.amenities.join(', ')}</Text>
                ) : null}
              </AdminEntityCard>
            ))}

            <AdminListFooter hasMore={hasMore} label="venue" loadedCount={venues.length} loadingMore={loadingMore} />
          </View>
        )}
      </PageContainer>

      <AdminModal
        footer={
          <>
            <AccountPrimaryButton label="Cancel" onPress={closeModal} tone="secondary" />
            <AccountPrimaryButton
              icon={editingVenueId ? 'save' : 'plus-circle'}
              label={editingVenueId ? 'Save venue' : 'Create venue'}
              loading={Boolean(savingVenueId)}
              onPress={() => void saveVenue()}
            />
          </>
        }
        onClose={closeModal}
        title={selectedVenue ? `Edit ${selectedVenue.name}` : 'Create venue'}
        visible={creating || Boolean(editingVenueId)}
      >
        <AccountTextField
          label="Name"
          onChangeText={(value) => setFormState((current) => ({ ...current, name: value }))}
          value={formState.name}
        />
        <AccountTextField
          autoCapitalize="none"
          label="Slug (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, slug: value }))}
          value={formState.slug}
        />
        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.filterRow}>
            {VENUE_TYPES.map((type) => (
              <AccountChoiceChip
                key={type}
                label={type}
                onPress={() => setFormState((current) => ({ ...current, type }))}
                selected={formState.type === type}
              />
            ))}
          </View>
        </View>
        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Owner organization</Text>
          <SearchField
            onChangeText={setOrgPickerQuery}
            onClear={() => setOrgPickerQuery('')}
            placeholder="Search organizations"
            value={orgPickerQuery}
          />
          <View style={styles.filterRow}>
            <AccountChoiceChip
              label="Standalone"
              onPress={() => setFormState((current) => ({ ...current, orgId: '' }))}
              selected={!formState.orgId}
            />
            {formState.orgId && !organizations.some((organization) => organization.orgId === formState.orgId) ? (
              <AccountChoiceChip
                label={organizationNameMap.get(formState.orgId) ?? `Org ${formState.orgId.slice(0, 8)}`}
                onPress={() => undefined}
                selected
              />
            ) : null}
            {organizations.map((organization) => (
              <AccountChoiceChip
                key={organization.orgId}
                label={organization.name}
                onPress={() => setFormState((current) => ({ ...current, orgId: organization.orgId }))}
                selected={formState.orgId === organization.orgId}
              />
            ))}
          </View>
        </View>
        <AccountTextField
          label="Website / stream link (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, url: value }))}
          placeholder="https://..."
          value={formState.url}
        />
        <AccountTextField
          keyboardType="phone-pad"
          label="Capacity (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, capacity: value }))}
          value={formState.capacity}
        />
        <AccountTextField
          autoCapitalize="none"
          label="Amenities (comma-separated)"
          onChangeText={(value) => setFormState((current) => ({ ...current, amenities: value }))}
          value={formState.amenities}
        />
        <AccountTextField
          label="Street (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, street: value }))}
          value={formState.street}
        />
        <AccountTextField
          label="City"
          onChangeText={(value) => setFormState((current) => ({ ...current, city: value }))}
          value={formState.city}
        />
        <AccountTextField
          label="Region / State (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, region: value }))}
          value={formState.region}
        />
        <AccountTextField
          label="Postal code (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, postalCode: value }))}
          value={formState.postalCode}
        />
        <AccountTextField
          label="Country"
          onChangeText={(value) => setFormState((current) => ({ ...current, country: value }))}
          value={formState.country}
        />
      </AdminModal>
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 14,
  },
  metaText: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  modalLabel: {
    ...typography.bodySemiBold,
    fontSize: 14,
  },
  modalSection: {
    gap: 10,
  },
  section: {
    gap: 14,
  },
});
