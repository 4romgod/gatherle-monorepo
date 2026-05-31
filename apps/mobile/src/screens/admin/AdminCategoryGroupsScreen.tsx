import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  CreateEventCategoryGroupDocument,
  DeleteEventCategoryGroupBySlugDocument,
  UpdateEventCategoryGroupDocument,
} from '@data/graphql/mutation/EventCategoryGroup/mutation';
import { GetEventCategoriesDocument } from '@data/graphql/query/EventCategory/query';
import { GetEventCategoryGroupsDocument } from '@data/graphql/query/EventCategoryGroup/query';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { getApolloAuthContext } from '@/lib/auth';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminPill } from '@/components/admin/AdminPill';
import { InlineButton } from '@/components/core/InlineButton';
import { typography } from '@/app/theme/typography';

type GroupFormState = {
  eventCategories: string[];
  name: string;
};

const INITIAL_GROUP_FORM: GroupFormState = {
  eventCategories: [],
  name: '',
};

export function AdminCategoryGroupsScreen() {
  const { showToast } = useAppFeedback();
  const { authToken, isAdmin, isAuthenticated, loading: accessLoading, refetch: refetchAdminAccess } = useAdminAccess();
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formState, setFormState] = useState<GroupFormState>(INITIAL_GROUP_FORM);
  const [creating, setCreating] = useState(false);
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);

  const groupsQuery = useQuery(GetEventCategoryGroupsDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    ...getApolloAuthContext(authToken),
  });
  const categoriesQuery = useQuery(GetEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !authToken || !isAdmin,
    ...getApolloAuthContext(authToken),
  });

  const groups = groupsQuery.data?.readEventCategoryGroups ?? [];
  const categories = categoriesQuery.data?.readEventCategories ?? [];
  const selectedGroup = useMemo(
    () => groups.find((group) => group.eventCategoryGroupId === editingGroupId) ?? null,
    [editingGroupId, groups],
  );

  const [createEventCategoryGroup] = useMutation(CreateEventCategoryGroupDocument, getApolloAuthContext(authToken));
  const [updateEventCategoryGroup] = useMutation(UpdateEventCategoryGroupDocument, getApolloAuthContext(authToken));
  const [deleteEventCategoryGroupBySlug] = useMutation(
    DeleteEventCategoryGroupBySlugDocument,
    getApolloAuthContext(authToken),
  );

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([refetchAdminAccess(), groupsQuery.refetch(), categoriesQuery.refetch()]);
  };

  const { onRefresh, refreshing } = usePullToRefresh(refreshAll);

  const openCreateModal = () => {
    setCreating(true);
    setEditingGroupId(null);
    setFormState(INITIAL_GROUP_FORM);
  };

  const openEditModal = (groupId: string) => {
    const group = groups.find((entry) => entry.eventCategoryGroupId === groupId);
    if (!group) {
      return;
    }

    setCreating(false);
    setEditingGroupId(groupId);
    setFormState({
      eventCategories: group.eventCategories.map((category) => category.eventCategoryId),
      name: group.name ?? '',
    });
  };

  const closeModal = () => {
    setCreating(false);
    setEditingGroupId(null);
  };

  const toggleCategory = (categoryId: string) => {
    setFormState((current) => ({
      ...current,
      eventCategories: current.eventCategories.includes(categoryId)
        ? current.eventCategories.filter((entry) => entry !== categoryId)
        : [...current.eventCategories, categoryId],
    }));
  };

  const saveGroup = async () => {
    if (!formState.name.trim() || formState.eventCategories.length === 0) {
      showToast({ message: 'Provide a name and at least one category.', tone: 'error' });
      return;
    }

    const nextSavingId = editingGroupId ?? 'create';
    setSavingGroupId(nextSavingId);
    try {
      if (editingGroupId) {
        await updateEventCategoryGroup({
          variables: {
            input: {
              eventCategories: formState.eventCategories,
              eventCategoryGroupId: editingGroupId,
              name: formState.name.trim(),
            },
          },
        });
      } else {
        await createEventCategoryGroup({
          variables: {
            input: {
              eventCategories: formState.eventCategories,
              name: formState.name.trim(),
            },
          },
        });
      }

      await refreshAll();
      closeModal();
      showToast({ message: editingGroupId ? 'Group saved.' : 'Group created.', tone: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save this group.",
        tone: 'error',
      });
    } finally {
      setSavingGroupId(null);
    }
  };

  const confirmDelete = (slug: string, name: string) => {
    Alert.alert('Delete group', `Delete ${name}? This action cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void (async () => {
            try {
              await deleteEventCategoryGroupBySlug({ variables: { slug } });
              await refreshAll();
              showToast({ message: 'Group deleted.', tone: 'success' });
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't delete this group.",
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
        <StateNotice message="Sign in with a Gatherle admin account to manage category groups." />
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
        <StateNotice message="Only Gatherle admins can curate category groups." />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.section}>
          <SectionHeading actionLabel="Create" onPressAction={openCreateModal} title="Category groups" />
          <Text style={styles.helperText}>
            Bundle related categories together for curated browse and discovery surfaces.
          </Text>
        </View>

        {(groupsQuery.error || categoriesQuery.error) && groups.length === 0 ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load category groups."
            onPressAction={() => void refreshAll()}
          />
        ) : groupsQuery.loading && groups.length === 0 ? (
          <AdminEntityListSkeleton />
        ) : groups.length === 0 ? (
          <StateNotice message="No category groups are available yet." />
        ) : (
          <View style={styles.list}>
            {groups.map((group) => (
              <AdminEntityCard
                key={group.eventCategoryGroupId}
                actions={
                  <View style={styles.actionRow}>
                    <InlineButton
                      compact
                      label="Edit"
                      onPress={() => openEditModal(group.eventCategoryGroupId)}
                      tone="secondary"
                    />
                    <InlineButton
                      compact
                      label="Delete"
                      onPress={() => confirmDelete(group.slug, group.name)}
                      tone="primary"
                    />
                  </View>
                }
                description={group.eventCategories.map((category) => category.name).join(', ')}
                meta={
                  <AdminPill
                    label={`${group.eventCategories.length} categor${group.eventCategories.length === 1 ? 'y' : 'ies'}`}
                    tone="success"
                  />
                }
                subtitle={group.slug}
                title={group.name}
              />
            ))}
          </View>
        )}
      </PageContainer>

      <AdminModal
        footer={
          <>
            <AccountPrimaryButton label="Cancel" onPress={closeModal} tone="secondary" />
            <AccountPrimaryButton
              icon={editingGroupId ? 'save' : 'plus-circle'}
              label={editingGroupId ? 'Save group' : 'Create group'}
              loading={Boolean(savingGroupId)}
              onPress={() => void saveGroup()}
            />
          </>
        }
        onClose={closeModal}
        title={selectedGroup ? `Edit ${selectedGroup.name}` : 'Create category group'}
        visible={creating || Boolean(editingGroupId)}
      >
        <AccountTextField
          label="Name"
          onChangeText={(value) => setFormState((current) => ({ ...current, name: value }))}
          value={formState.name}
        />
        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Categories</Text>
          <View style={styles.filterRow}>
            {categories.map((category) => (
              <AccountChoiceChip
                key={category.eventCategoryId}
                label={category.name}
                onPress={() => toggleCategory(category.eventCategoryId)}
                selected={formState.eventCategories.includes(category.eventCategoryId)}
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
  helperText: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 14,
  },
  modalLabel: {
    ...typography.bodySemiBold,
    fontSize: 14,
  },
  modalSection: {
    gap: 10,
  },
  section: {
    gap: 10,
  },
});
