import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  CreateOrganizationDocument,
  DeleteOrganizationDocument,
  UpdateOrganizationDocument,
} from '@data/graphql/mutation/Organization/mutation';
import { GetOrganizationsDocument } from '@data/graphql/query/Organization/query';
import { EventVisibility, OrganizationRole } from '@data/graphql/types/graphql';
import { useNavigation } from '@react-navigation/native';
import type { DetailNavigation } from '@/app/navigation/navigationTypes';
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
import { ADMIN_PAGE_SIZE, buildAdminOrganizationQueryOptions, parseCommaSeparated } from '@/lib/admin/queryOptions';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminListFooter } from '@/components/admin/AdminListFooter';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminPill } from '@/components/admin/AdminPill';
import { InlineButton } from '@/components/core/InlineButton';
import { typography } from '@/app/theme/typography';

type OrganizationFormState = {
  billingEmail: string;
  defaultVisibility: EventVisibility;
  description: string;
  domainsAllowed: string;
  name: string;
  tags: string;
};

const ORGANIZATION_VISIBILITIES = Object.values(EventVisibility);
const INITIAL_ORGANIZATION_FORM: OrganizationFormState = {
  billingEmail: '',
  defaultVisibility: EventVisibility.Public,
  description: '',
  domainsAllowed: '',
  name: '',
  tags: '',
};

function buildOrganizationFormState(organization: {
  billingEmail?: string | null;
  defaultVisibility?: EventVisibility | null;
  description?: string | null;
  domainsAllowed?: string[] | null;
  name?: string | null;
  tags?: string[] | null;
}): OrganizationFormState {
  return {
    billingEmail: organization.billingEmail ?? '',
    defaultVisibility: organization.defaultVisibility ?? EventVisibility.Public,
    description: organization.description ?? '',
    domainsAllowed: organization.domainsAllowed?.join(', ') ?? '',
    name: organization.name ?? '',
    tags: organization.tags?.join(', ') ?? '',
  };
}

function getOwnerLabel(organization: {
  ownerId?: string | null;
  memberRoles?: Array<{ role: OrganizationRole; userId: string; username?: string | null } | null> | null;
}) {
  const ownerMembership =
    organization.memberRoles?.find((membership) => membership?.role === OrganizationRole.Owner) ??
    organization.memberRoles?.find((membership) => membership?.userId === organization.ownerId);

  if (ownerMembership?.username) {
    return `@${ownerMembership.username}`;
  }

  if (ownerMembership?.userId) {
    return ownerMembership.userId.slice(0, 8);
  }

  if (organization.ownerId) {
    return organization.ownerId.slice(0, 8);
  }

  return 'Unassigned';
}

export function AdminOrganizationsScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const { showToast } = useAppFeedback();
  const {
    authToken,
    isAdmin,
    isAuthenticated,
    loading: accessLoading,
    refetch: refetchAdminAccess,
    userId,
  } = useAdminAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [editingOrganizationId, setEditingOrganizationId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formState, setFormState] = useState<OrganizationFormState>(INITIAL_ORGANIZATION_FORM);
  const [savingOrganizationId, setSavingOrganizationId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const query = useQuery(GetOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      options: buildAdminOrganizationQueryOptions(debouncedSearchQuery, ADMIN_PAGE_SIZE, 0),
    },
    ...getApolloAuthContext(authToken),
  });
  const organizations = query.data?.readOrganizations ?? [];
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.orgId === editingOrganizationId) ?? null,
    [editingOrganizationId, organizations],
  );
  const [createOrganization] = useMutation(CreateOrganizationDocument, getApolloAuthContext(authToken));
  const [updateOrganization] = useMutation(UpdateOrganizationDocument, getApolloAuthContext(authToken));
  const [deleteOrganization] = useMutation(DeleteOrganizationDocument, getApolloAuthContext(authToken));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!query.loading) {
      setHasMore(organizations.length >= ADMIN_PAGE_SIZE);
    }
  }, [organizations.length, query.loading]);

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([
      refetchAdminAccess(),
      query.refetch({
        options: buildAdminOrganizationQueryOptions(
          debouncedSearchQuery,
          Math.max(organizations.length, ADMIN_PAGE_SIZE),
          0,
        ),
      }),
    ]);
  };

  const { onRefresh, refreshing } = usePullToRefresh(refreshAll);

  const loadMore = async () => {
    if (query.loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    let nextBatchCount = 0;

    try {
      await query.fetchMore({
        variables: {
          options: buildAdminOrganizationQueryOptions(debouncedSearchQuery, ADMIN_PAGE_SIZE, organizations.length),
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const nextItems = fetchMoreResult?.readOrganizations ?? [];
          nextBatchCount = nextItems.length;

          if (nextItems.length === 0) {
            return previousResult;
          }

          return {
            ...previousResult,
            readOrganizations: [...(previousResult.readOrganizations ?? []), ...nextItems],
          };
        },
      });

      setHasMore(nextBatchCount === ADMIN_PAGE_SIZE);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't load more organizations.",
        tone: 'error',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const infiniteScroll = useInfiniteScroll({
    enabled: hasMore,
    loading: query.loading || loadingMore,
    onEndReached: loadMore,
    resetKey: `${debouncedSearchQuery}:${organizations.length}`,
  });

  const openCreateModal = () => {
    setCreating(true);
    setEditingOrganizationId(null);
    setFormState(INITIAL_ORGANIZATION_FORM);
  };

  const openEditModal = (orgId: string) => {
    const organization = organizations.find((entry) => entry.orgId === orgId);
    if (!organization) {
      return;
    }

    setCreating(false);
    setEditingOrganizationId(orgId);
    setFormState(buildOrganizationFormState(organization));
  };

  const closeModal = () => {
    setCreating(false);
    setEditingOrganizationId(null);
  };

  const saveOrganization = async () => {
    if (!formState.name.trim()) {
      showToast({ message: 'Organization name is required.', tone: 'error' });
      return;
    }

    if (!userId && !editingOrganizationId) {
      showToast({ message: 'We could not resolve the admin owner for this organization.', tone: 'error' });
      return;
    }

    const nextSavingId = editingOrganizationId ?? 'create';
    setSavingOrganizationId(nextSavingId);
    try {
      const payload = {
        billingEmail: formState.billingEmail.trim() || undefined,
        defaultVisibility: formState.defaultVisibility,
        description: formState.description.trim() || undefined,
        domainsAllowed: parseCommaSeparated(formState.domainsAllowed),
        name: formState.name.trim(),
        tags: parseCommaSeparated(formState.tags),
      };

      if (editingOrganizationId) {
        await updateOrganization({
          variables: {
            input: {
              ...payload,
              orgId: editingOrganizationId,
            },
          },
        });
      } else {
        await createOrganization({
          variables: {
            input: {
              ...payload,
              ownerId: userId!,
            },
          },
        });
      }

      await refreshAll();
      closeModal();
      showToast({ message: editingOrganizationId ? 'Organization saved.' : 'Organization created.', tone: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save this organization.",
        tone: 'error',
      });
    } finally {
      setSavingOrganizationId(null);
    }
  };

  const confirmDelete = (orgId: string, name: string) => {
    Alert.alert('Delete organization', `Delete ${name}? This action cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void (async () => {
            try {
              await deleteOrganization({ variables: { orgId } });
              await refreshAll();
              showToast({ message: 'Organization deleted.', tone: 'success' });
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't delete this organization.",
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
        <StateNotice message="Sign in with a Gatherle admin account to manage organizations." />
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
        <StateNotice message="Only Gatherle admins can manage organizations." />
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
          <SectionHeading actionLabel="Create" onPressAction={openCreateModal} title="Organizations" />
          <SearchField
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search name, slug, billing email, tags, or domains"
            value={searchQuery}
          />
        </View>

        {query.error && organizations.length === 0 ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load organizations."
            onPressAction={() => void refreshAll()}
          />
        ) : query.loading && organizations.length === 0 ? (
          <AdminEntityListSkeleton />
        ) : organizations.length === 0 ? (
          <StateNotice
            message={
              debouncedSearchQuery
                ? 'No matching organizations for that search.'
                : 'No organizations are available yet.'
            }
          />
        ) : (
          <View style={styles.list}>
            {organizations.map((organization) => (
              <AdminEntityCard
                key={organization.orgId}
                actions={
                  <View style={styles.actionRow}>
                    <InlineButton
                      compact
                      label="Members"
                      onPress={() =>
                        navigation.navigate('OrganizationMembers', {
                          orgId: organization.orgId,
                          orgName: organization.name,
                        })
                      }
                      tone="neutral"
                    />
                    <InlineButton
                      compact
                      label="Edit"
                      onPress={() => openEditModal(organization.orgId)}
                      tone="secondary"
                    />
                    <InlineButton
                      compact
                      label="Delete"
                      onPress={() => confirmDelete(organization.orgId, organization.name)}
                      tone="primary"
                    />
                  </View>
                }
                description={organization.description}
                meta={
                  <>
                    <AdminPill label={`Owner · ${getOwnerLabel(organization)}`} tone="default" />
                    <AdminPill
                      label={`Default · ${organization.defaultVisibility ?? EventVisibility.Public}`}
                      tone="primary"
                    />
                    {organization.memberRoles?.length ? (
                      <AdminPill label={`${organization.memberRoles.length} team`} tone="success" />
                    ) : null}
                  </>
                }
                subtitle={`/${organization.slug}`}
                title={organization.name}
              >
                {organization.billingEmail ? (
                  <Text style={styles.metaText}>Billing: {organization.billingEmail}</Text>
                ) : null}
                {organization.tags?.length ? (
                  <Text style={styles.metaText}>Tags: {organization.tags.join(', ')}</Text>
                ) : null}
                {organization.domainsAllowed?.length ? (
                  <Text style={styles.metaText}>Domains: {organization.domainsAllowed.join(', ')}</Text>
                ) : null}
              </AdminEntityCard>
            ))}

            <AdminListFooter
              hasMore={hasMore}
              label="organization"
              loadedCount={organizations.length}
              loadingMore={loadingMore}
            />
          </View>
        )}
      </PageContainer>

      <AdminModal
        footer={
          <>
            <AccountPrimaryButton label="Cancel" onPress={closeModal} tone="secondary" />
            <AccountPrimaryButton
              icon={editingOrganizationId ? 'save' : 'plus-circle'}
              label={editingOrganizationId ? 'Save organization' : 'Create organization'}
              loading={Boolean(savingOrganizationId)}
              onPress={() => void saveOrganization()}
            />
          </>
        }
        onClose={closeModal}
        title={selectedOrganization ? `Edit ${selectedOrganization.name}` : 'Create organization'}
        visible={creating || Boolean(editingOrganizationId)}
      >
        <AccountTextField
          label="Name"
          onChangeText={(value) => setFormState((current) => ({ ...current, name: value }))}
          value={formState.name}
        />
        <AccountTextField
          label="Description (optional)"
          multiline
          onChangeText={(value) => setFormState((current) => ({ ...current, description: value }))}
          value={formState.description}
        />
        <AccountTextField
          keyboardType="email-address"
          label="Billing email (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, billingEmail: value }))}
          value={formState.billingEmail}
        />
        <AccountTextField
          autoCapitalize="none"
          label="Tags (comma-separated)"
          onChangeText={(value) => setFormState((current) => ({ ...current, tags: value }))}
          value={formState.tags}
        />
        <AccountTextField
          autoCapitalize="none"
          label="Allowed domains (comma-separated)"
          onChangeText={(value) => setFormState((current) => ({ ...current, domainsAllowed: value }))}
          value={formState.domainsAllowed}
        />
        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Default event visibility</Text>
          <View style={styles.filterRow}>
            {ORGANIZATION_VISIBILITIES.map((visibility) => (
              <AccountChoiceChip
                key={visibility}
                label={visibility}
                onPress={() => setFormState((current) => ({ ...current, defaultVisibility: visibility }))}
                selected={formState.defaultVisibility === visibility}
              />
            ))}
          </View>
        </View>
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
