import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  CreateEventCategoryDocument,
  DeleteEventCategoryByIdDocument,
  UpdateEventCategoryDocument,
} from '@data/graphql/mutation/EventCategory/mutation';
import { GetEventCategoriesDocument } from '@data/graphql/query/EventCategory/query';
import { PageContainer } from '@/components/core/PageContainer';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
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

type CategoryFormState = {
  color: string;
  description: string;
  iconName: string;
  name: string;
};

const INITIAL_CATEGORY_FORM: CategoryFormState = {
  color: '',
  description: '',
  iconName: '',
  name: '',
};

export function AdminCategoriesScreen() {
  const { showToast } = useAppFeedback();
  const { authToken, isAdmin, isAuthenticated, loading: accessLoading, refetch: refetchAdminAccess } = useAdminAccess();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>(INITIAL_CATEGORY_FORM);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useQuery(GetEventCategoriesDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    ...getApolloAuthContext(authToken),
  });
  const categories = query.data?.readEventCategories ?? [];
  const selectedCategory = useMemo(
    () => categories.find((category) => category.eventCategoryId === editingCategoryId) ?? null,
    [categories, editingCategoryId],
  );
  const [createEventCategory] = useMutation(CreateEventCategoryDocument, getApolloAuthContext(authToken));
  const [updateEventCategory] = useMutation(UpdateEventCategoryDocument, getApolloAuthContext(authToken));
  const [deleteEventCategoryById] = useMutation(DeleteEventCategoryByIdDocument, getApolloAuthContext(authToken));

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([refetchAdminAccess(), query.refetch()]);
  };

  const { onRefresh, refreshing } = usePullToRefresh(refreshAll);

  const openCreateModal = () => {
    setCreating(true);
    setEditingCategoryId(null);
    setFormState(INITIAL_CATEGORY_FORM);
  };

  const openEditModal = (categoryId: string) => {
    const category = categories.find((entry) => entry.eventCategoryId === categoryId);
    if (!category) {
      return;
    }

    setEditingCategoryId(categoryId);
    setFormState({
      color: category.color ?? '',
      description: category.description ?? '',
      iconName: category.iconName ?? '',
      name: category.name ?? '',
    });
  };

  const closeModal = () => {
    setEditingCategoryId(null);
    setCreating(false);
  };

  const saveCategory = async () => {
    if (!formState.name.trim() || !formState.description.trim() || !formState.iconName.trim()) {
      showToast({ message: 'Name, description, and icon are required.', tone: 'error' });
      return;
    }

    const nextSavingId = editingCategoryId ?? 'create';
    setSavingCategoryId(nextSavingId);

    try {
      if (editingCategoryId) {
        await updateEventCategory({
          variables: {
            input: {
              color: formState.color.trim() || undefined,
              description: formState.description.trim(),
              eventCategoryId: editingCategoryId,
              iconName: formState.iconName.trim(),
              name: formState.name.trim(),
            },
          },
        });
      } else {
        await createEventCategory({
          variables: {
            input: {
              color: formState.color.trim() || undefined,
              description: formState.description.trim(),
              iconName: formState.iconName.trim(),
              name: formState.name.trim(),
            },
          },
        });
      }

      await refreshAll();
      closeModal();
      showToast({ message: editingCategoryId ? 'Category saved.' : 'Category created.', tone: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save this category.",
        tone: 'error',
      });
    } finally {
      setSavingCategoryId(null);
    }
  };

  const confirmDelete = (categoryId: string, name: string) => {
    Alert.alert('Delete category', `Delete ${name}? This action cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void (async () => {
            try {
              await deleteEventCategoryById({ variables: { eventCategoryId: categoryId } });
              await refreshAll();
              showToast({ message: 'Category deleted.', tone: 'success' });
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't delete this category.",
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
        <StateNotice message="Sign in with a Gatherle admin account to manage categories." />
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
        <StateNotice message="Only Gatherle admins can manage event taxonomy." />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.section}>
          <SectionHeading actionLabel="Create" onPressAction={openCreateModal} title="Categories" />
          <Text style={styles.helperText}>Maintain the taxonomy that powers interest selection and discovery.</Text>
        </View>

        {query.error && categories.length === 0 ? (
          <StateNotice
            actionLabel="Retry"
            message="We couldn’t load categories."
            onPressAction={() => void refreshAll()}
          />
        ) : query.loading && categories.length === 0 ? (
          <AdminEntityListSkeleton />
        ) : categories.length === 0 ? (
          <StateNotice message="No categories are available yet." />
        ) : (
          <View style={styles.list}>
            {categories.map((category) => (
              <AdminEntityCard
                key={category.eventCategoryId}
                actions={
                  <View style={styles.actionRow}>
                    <InlineButton
                      compact
                      label="Edit"
                      onPress={() => openEditModal(category.eventCategoryId)}
                      tone="secondary"
                    />
                    <InlineButton
                      compact
                      label="Delete"
                      onPress={() => confirmDelete(category.eventCategoryId, category.name)}
                      tone="primary"
                    />
                  </View>
                }
                description={category.description}
                meta={
                  <>
                    <AdminPill label={`Icon · ${category.iconName}`} tone="default" />
                    {category.color ? <AdminPill label={category.color} tone="primary" /> : null}
                    <AdminPill label={`${category.interestedUsersCount ?? 0} interested`} tone="success" />
                  </>
                }
                subtitle={`/${category.slug}`}
                title={category.name}
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
              icon={editingCategoryId ? 'save' : 'plus-circle'}
              label={editingCategoryId ? 'Save category' : 'Create category'}
              loading={Boolean(savingCategoryId)}
              onPress={() => void saveCategory()}
            />
          </>
        }
        onClose={closeModal}
        title={selectedCategory ? `Edit ${selectedCategory.name}` : 'Create category'}
        visible={creating || Boolean(editingCategoryId)}
      >
        <AccountTextField
          label="Name"
          onChangeText={(value) => setFormState((current) => ({ ...current, name: value }))}
          value={formState.name}
        />
        <AccountTextField
          autoCapitalize="none"
          label="Icon name"
          onChangeText={(value) => setFormState((current) => ({ ...current, iconName: value }))}
          value={formState.iconName}
        />
        <AccountTextField
          autoCapitalize="none"
          label="Color (optional)"
          onChangeText={(value) => setFormState((current) => ({ ...current, color: value }))}
          placeholder="#6B5CFF"
          value={formState.color}
        />
        <AccountTextField
          label="Description"
          multiline
          onChangeText={(value) => setFormState((current) => ({ ...current, description: value }))}
          value={formState.description}
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
  helperText: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 14,
  },
  section: {
    gap: 10,
  },
});
