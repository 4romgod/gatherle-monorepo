import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { AdminUpdateUserDocument, DeleteUserByIdDocument } from '@data/graphql/mutation/User/mutation';
import { GetAdminUsersDocument } from '@data/graphql/query/User/query';
import { UserRole } from '@data/graphql/types/graphql';
import { PageContainer } from '@/components/core/PageContainer';
import { SearchField } from '@/components/core/SearchField';
import { SectionHeading } from '@/components/core/SectionHeading';
import { StateNotice } from '@/components/core/StateNotice';
import { AccountChoiceChip } from '@/components/account/shared/AccountChoiceChip';
import { AccountPrimaryButton } from '@/components/account/shared/AccountPrimaryButton';
import { AccountSwitchRow } from '@/components/account/shared/AccountSwitchRow';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/core/useInfiniteScroll';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { getApolloAuthContext } from '@/lib/auth';
import { ADMIN_USER_PAGE_SIZE, buildAdminUserQueryOptions, type AdminUserQueue } from '@/lib/admin/queryOptions';
import { useAppFeedback } from '@/app/providers/AppFeedbackProvider';
import { AdminEntityCard } from '@/components/admin/AdminEntityCard';
import { AdminEntityListSkeleton } from '@/components/admin/AdminEntityCardSkeleton';
import { AdminListFooter } from '@/components/admin/AdminListFooter';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminPill } from '@/components/admin/AdminPill';
import { InlineButton } from '@/components/core/InlineButton';
import { typography } from '@/app/theme/typography';

const USER_QUEUE_OPTIONS: { key: AdminUserQueue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'admins', label: 'Admins' },
  { key: 'hosts', label: 'Hosts' },
  { key: 'unverified', label: 'Unverified' },
];

const USER_ROLE_OPTIONS = [UserRole.Admin, UserRole.Host, UserRole.User, UserRole.Guest];

type UserAccessFormState = {
  appAccessBlocked: boolean;
  emailVerified: boolean;
  userRole: UserRole;
};

function getUserDisplayName(user: {
  email?: string | null;
  family_name?: string | null;
  given_name?: string | null;
  username?: string | null;
}) {
  const name = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return user.email ?? 'User';
}

export function AdminUsersScreen() {
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
  const [activeQueue, setActiveQueue] = useState<AdminUserQueue>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserAccessFormState>({
    appAccessBlocked: false,
    emailVerified: false,
    userRole: UserRole.User,
  });
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const query = useQuery(GetAdminUsersDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !isAuthenticated || !authToken || !isAdmin,
    variables: {
      options: buildAdminUserQueryOptions(debouncedSearchQuery, ADMIN_USER_PAGE_SIZE, 0, activeQueue),
    },
    ...getApolloAuthContext(authToken),
  });
  const users = query.data?.readUsers ?? [];
  const selectedUser = useMemo(
    () => users.find((user) => user.userId === editingUserId) ?? null,
    [editingUserId, users],
  );
  const [updateUser] = useMutation(AdminUpdateUserDocument, getApolloAuthContext(authToken));
  const [deleteUserById] = useMutation(DeleteUserByIdDocument, getApolloAuthContext(authToken));

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!query.loading) {
      setHasMore(users.length >= ADMIN_USER_PAGE_SIZE);
    }
  }, [query.loading, users.length]);

  const refreshAll = async () => {
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    await Promise.all([
      refetchAdminAccess(),
      query.refetch({
        options: buildAdminUserQueryOptions(
          debouncedSearchQuery,
          Math.max(users.length, ADMIN_USER_PAGE_SIZE),
          0,
          activeQueue,
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
          options: buildAdminUserQueryOptions(debouncedSearchQuery, ADMIN_USER_PAGE_SIZE, users.length, activeQueue),
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const nextItems = fetchMoreResult?.readUsers ?? [];
          nextBatchCount = nextItems.length;

          if (nextItems.length === 0) {
            return previousResult;
          }

          return {
            ...previousResult,
            readUsers: [...(previousResult.readUsers ?? []), ...nextItems],
          };
        },
      });

      setHasMore(nextBatchCount === ADMIN_USER_PAGE_SIZE);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't load more users.",
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
    resetKey: `${activeQueue}:${debouncedSearchQuery}:${users.length}`,
  });

  const openEditModal = (nextUserId: string) => {
    const nextUser = users.find((user) => user.userId === nextUserId);
    if (!nextUser) {
      return;
    }

    setFormState({
      appAccessBlocked: nextUser.appAccessBlocked ?? false,
      emailVerified: nextUser.emailVerified ?? false,
      userRole: nextUser.userRole ?? UserRole.User,
    });
    setEditingUserId(nextUserId);
  };

  const closeEditModal = () => {
    setEditingUserId(null);
  };

  const saveUserAccess = async () => {
    if (!editingUserId) {
      return;
    }

    if (editingUserId === userId) {
      showToast({ message: 'You cannot change your own role, verification, or app access.', tone: 'error' });
      return;
    }

    setSavingUserId(editingUserId);
    try {
      await updateUser({
        variables: {
          input: {
            appAccessBlocked: formState.appAccessBlocked,
            emailVerified: formState.emailVerified,
            userId: editingUserId,
            userRole: formState.userRole,
          },
        },
      });
      await refreshAll();
      setEditingUserId(null);
      showToast({ message: 'User access saved.', tone: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "We couldn't save this user.",
        tone: 'error',
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const confirmDelete = (nextUserId: string, name: string) => {
    Alert.alert('Delete user', `Delete ${name}? This action cannot be undone.`, [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void (async () => {
            try {
              await deleteUserById({ variables: { userId: nextUserId } });
              await refreshAll();
              showToast({ message: 'User deleted.', tone: 'success' });
            } catch (error) {
              showToast({
                message: error instanceof Error ? error.message : "We couldn't delete this user.",
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
        <StateNotice message="Sign in with a Gatherle admin account to manage users." />
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
        <StateNotice message="Only Gatherle admins can manage platform users." />
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
          <SectionHeading title="Users" />
          <SearchField
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search users by name, username, or email"
            value={searchQuery}
          />
          <View style={styles.filterRow}>
            {USER_QUEUE_OPTIONS.map((queue) => (
              <AccountChoiceChip
                key={queue.key}
                label={queue.label}
                onPress={() => setActiveQueue(queue.key)}
                selected={activeQueue === queue.key}
              />
            ))}
          </View>
        </View>

        {query.error && users.length === 0 ? (
          <StateNotice actionLabel="Retry" message="We couldn’t load users." onPressAction={() => void refreshAll()} />
        ) : query.loading && users.length === 0 ? (
          <AdminEntityListSkeleton />
        ) : users.length === 0 ? (
          <StateNotice
            message={
              debouncedSearchQuery ? 'No matching users for that search.' : 'No users are available for moderation yet.'
            }
          />
        ) : (
          <View style={styles.list}>
            {users.map((user) => {
              const displayName = getUserDisplayName(user);
              const isCurrentAdmin = user.userId === userId;
              return (
                <AdminEntityCard
                  key={user.userId}
                  actions={
                    <View style={styles.actionRow}>
                      {!isCurrentAdmin ? (
                        <>
                          <InlineButton
                            compact
                            label="Edit"
                            onPress={() => openEditModal(user.userId)}
                            tone="secondary"
                          />
                          <InlineButton
                            compact
                            label="Delete"
                            onPress={() => confirmDelete(user.userId, displayName)}
                            tone="primary"
                          />
                        </>
                      ) : null}
                    </View>
                  }
                  description={user.email}
                  meta={
                    <>
                      <AdminPill label={`Role · ${user.userRole ?? UserRole.User}`} tone="primary" />
                      <AdminPill
                        label={user.emailVerified ? 'Verified' : 'Unverified'}
                        tone={user.emailVerified ? 'success' : 'default'}
                      />
                      {user.appAccessBlocked ? <AdminPill label="App blocked" tone="error" /> : null}
                      {isCurrentAdmin ? <AdminPill label="You" tone="default" /> : null}
                    </>
                  }
                  subtitle={user.username ? `@${user.username}` : null}
                  title={displayName}
                >
                  {user.bio ? <Text style={styles.metaText}>{user.bio}</Text> : null}
                  {user.location?.city || user.location?.country ? (
                    <Text style={styles.metaText}>
                      {[user.location?.city, user.location?.state, user.location?.country].filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                </AdminEntityCard>
              );
            })}

            <AdminListFooter hasMore={hasMore} label="user" loadedCount={users.length} loadingMore={loadingMore} />
          </View>
        )}
      </PageContainer>

      <AdminModal
        footer={
          <>
            <AccountPrimaryButton label="Cancel" onPress={closeEditModal} tone="secondary" />
            <AccountPrimaryButton
              icon="save"
              label="Save access"
              loading={Boolean(savingUserId)}
              onPress={() => void saveUserAccess()}
            />
          </>
        }
        onClose={closeEditModal}
        title={selectedUser ? `Edit ${getUserDisplayName(selectedUser)}` : 'Edit user'}
        visible={Boolean(selectedUser)}
      >
        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Role</Text>
          <View style={styles.filterRow}>
            {USER_ROLE_OPTIONS.map((role) => (
              <AccountChoiceChip
                key={role}
                label={role}
                onPress={() => setFormState((current) => ({ ...current, userRole: role }))}
                selected={formState.userRole === role}
              />
            ))}
          </View>
        </View>

        <AccountSwitchRow
          description="Stop this account from using Gatherle while signed in."
          onValueChange={(value) => setFormState((current) => ({ ...current, appAccessBlocked: value }))}
          title="Block app access"
          value={formState.appAccessBlocked}
        />

        <AccountSwitchRow
          description="Mark whether this account's email address is trusted and verified."
          onValueChange={(value) => setFormState((current) => ({ ...current, emailVerified: value }))}
          title="Email verified"
          value={formState.emailVerified}
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
