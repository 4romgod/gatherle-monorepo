'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Delete, Edit, Save } from '@mui/icons-material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useAppContext } from '@/hooks';
import { AdminUsersSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { SortOrderInput, UserRole } from '@/data/graphql/types/graphql';
import { GetUsersDocument } from '@/data/graphql/query/User/query';
import { DeleteUserByIdDocument, UpdateUserDocument } from '@/data/graphql/query/User/mutation';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  ADMIN_SURFACE_SX,
  AdminEmptyState,
  AdminListFooter,
  AdminListSearchField,
  AdminSectionHeader,
} from '@/components/admin/admin-ui';

const PAGE_SIZE = 16;

type UserQueue = 'all' | 'admins' | 'hosts' | 'unverified';

type UserFormState = {
  userRole: UserRole;
  emailVerified: boolean;
};

function buildUserQueryOptions(searchQuery: string, limit: number, skip = 0, queue: UserQueue = 'all') {
  const trimmedQuery = searchQuery.trim();
  const filters =
    queue === 'admins'
      ? [{ field: 'userRole', value: UserRole.Admin }]
      : queue === 'hosts'
        ? [{ field: 'userRole', value: UserRole.Host }]
        : queue === 'unverified'
          ? [{ field: 'emailVerified', value: false }]
          : undefined;

  return {
    pagination: { limit, skip },
    sort: [{ field: 'username', order: SortOrderInput.Asc }],
    ...(filters ? { filters } : {}),
    ...(trimmedQuery.length >= 2
      ? {
          search: {
            value: trimmedQuery,
            fields: ['username', 'given_name', 'family_name', 'email'],
          },
        }
      : {}),
  };
}

function buildUserFormState(user: { userRole?: UserRole | null; emailVerified?: boolean | null }): UserFormState {
  return {
    userRole: user.userRole ?? UserRole.User,
    emailVerified: user.emailVerified ?? false,
  };
}

export default function AdminUsersSection({ token, currentUserId }: AdminUsersSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeQueue, setActiveQueue] = useState<UserQueue>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const { data, loading, error, refetch, fetchMore } = useQuery(GetUsersDocument, {
    variables: {
      options: buildUserQueryOptions(debouncedSearchQuery, PAGE_SIZE, 0, activeQueue),
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  const users = data?.readUsers ?? [];
  const editingUser = editingUserId ? (users.find((user) => user.userId === editingUserId) ?? null) : null;
  const [formState, setFormState] = useState<Record<string, UserFormState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingUserDelete, setPendingUserDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const [updateUser] = useMutation(UpdateUserDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteUser] = useMutation(DeleteUserByIdDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    setFormState((prev) => {
      let changed = false;
      const nextState = { ...prev };
      users.forEach((user) => {
        if (user.userId && !nextState[user.userId]) {
          nextState[user.userId] = buildUserFormState(user);
          changed = true;
        }
      });
      return changed ? nextState : prev;
    });
  }, [users]);

  useEffect(() => {
    if (!loading) {
      setHasMore(users.length >= PAGE_SIZE);
    }
  }, [loading, users.length]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshUsers = async () => {
    const requestedLimit = Math.max(users.length, PAGE_SIZE);
    const result = await refetch({
      options: buildUserQueryOptions(debouncedSearchQuery, requestedLimit, 0, activeQueue),
    });
    const refreshedUsers = result.data?.readUsers ?? [];
    setHasMore(refreshedUsers.length >= requestedLimit);
  };

  const openEditDialog = (user: (typeof users)[number]) => {
    setFormState((prev) => ({
      ...prev,
      [user.userId]: buildUserFormState(user),
    }));
    setEditingUserId(user.userId);
  };

  const handleUpdate = async (userId: string) => {
    const payload = formState[userId];
    if (!payload) {
      return false;
    }

    setSavingId(userId);
    try {
      await updateUser({
        variables: {
          input: {
            userId,
            userRole: payload.userRole,
            emailVerified: payload.emailVerified,
          },
        },
      });
      await refreshUsers();
      notify('User access saved.');
      return true;
    } catch {
      notify('Unable to save user.', 'error');
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const requestDelete = (userId: string, name: string) => {
    setPendingUserDelete({ id: userId, name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingUserDelete) {
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteUser({ variables: { userId: pendingUserDelete.id } });
      await refreshUsers();
      notify('User deleted.');
      setPendingUserDelete(null);
    } catch {
      notify('Unable to delete user.', 'error');
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
          options: buildUserQueryOptions(debouncedSearchQuery, PAGE_SIZE, users.length, activeQueue),
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
      setHasMore(nextBatchCount === PAGE_SIZE);
    } catch {
      notify('Unable to load more users.', 'error');
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
    return <Typography color="error">Unable to load users right now.</Typography>;
  }

  return (
    <Stack spacing={3}>
      <AdminSectionHeader
        title="Role and access management"
        description="Review accounts, adjust roles, and repair verification state without deleting the user."
        meta={<Chip size="small" label={debouncedSearchQuery ? `${users.length} matches` : `${users.length} loaded`} />}
      />

      <AdminListSearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search users by name, username, or email"
        helperText="Type at least 2 characters to filter the user list."
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {[
          ['all', 'All'],
          ['admins', 'Admins'],
          ['hosts', 'Hosts'],
          ['unverified', 'Unverified'],
        ].map(([value, label]) => (
          <Chip
            key={value}
            clickable
            color={activeQueue === value ? 'primary' : 'default'}
            label={label}
            onClick={() => setActiveQueue(value as UserQueue)}
            variant={activeQueue === value ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {loading && users.length === 0 ? (
        <Stack spacing={2}>
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} variant="rounded" height={180} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : users.length === 0 ? (
        <AdminEmptyState
          title={debouncedSearchQuery ? 'No matching users' : 'No users found'}
          description={
            debouncedSearchQuery
              ? 'Try a different name, username, or email address.'
              : 'Once people sign up for Gatherle they’ll show up here for role management.'
          }
        />
      ) : (
        <Stack spacing={2}>
          {users.map((user) => (
            <Card key={user.userId} elevation={0} sx={ADMIN_SURFACE_SX}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', lg: 'center' }}
                    spacing={2}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {user.given_name} {user.family_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" variant="outlined" label={`Role · ${user.userRole ?? UserRole.User}`} />
                        <Chip
                          size="small"
                          color={user.emailVerified ? 'success' : 'default'}
                          variant={user.emailVerified ? 'filled' : 'outlined'}
                          label={user.emailVerified ? 'Verified' : 'Unverified'}
                        />
                        {currentUserId === user.userId ? <Chip size="small" variant="outlined" label="You" /> : null}
                      </Stack>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', lg: 'auto' }}>
                      <Button
                        startIcon={<Edit />}
                        variant="outlined"
                        size="small"
                        onClick={() => openEditDialog(user)}
                        disabled={currentUserId === user.userId}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Edit
                      </Button>
                      <Button
                        startIcon={<Delete />}
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => requestDelete(user.userId, `${user.given_name} ${user.family_name}`)}
                        disabled={Boolean(pendingUserDelete) || currentUserId === user.userId}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}

          <AdminListFooter
            label="user"
            loadedCount={users.length}
            hasMore={hasMore}
            loadingMore={loadingMore}
            sentinelRef={infiniteScrollRef}
          />
        </Stack>
      )}

      <Dialog
        open={Boolean(editingUserId)}
        onClose={() => setEditingUserId(null)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        slotProps={{ paper: { sx: { borderRadius: { xs: 0, md: 2 } } } }}
      >
        <DialogTitle
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Stack spacing={0.6}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.12em' }}>
                Edit user
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {editingUser ? `${editingUser.given_name} ${editingUser.family_name}` : 'User'}
              </Typography>
            </Stack>
            <IconButton onClick={() => setEditingUserId(null)} aria-label="Close edit user">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          {editingUserId ? (
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Role
                </Typography>
                <Select
                  value={formState[editingUserId]?.userRole ?? editingUser?.userRole ?? UserRole.User}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingUserId]: {
                        ...(prev[editingUserId] ?? buildUserFormState(editingUser ?? {})),
                        userRole: event.target.value as UserRole,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                  disabled={currentUserId === editingUserId}
                >
                  {Object.values(UserRole).map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={formState[editingUserId]?.emailVerified ?? editingUser?.emailVerified ?? false}
                    disabled={currentUserId === editingUserId}
                    onChange={(_event, checked) =>
                      setFormState((prev) => ({
                        ...prev,
                        [editingUserId]: {
                          ...(prev[editingUserId] ?? buildUserFormState(editingUser ?? {})),
                          emailVerified: checked,
                        },
                      }))
                    }
                  />
                }
                label="Email verified"
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => setEditingUserId(null)} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button
                  startIcon={savingId === editingUserId ? <CircularProgress size={16} /> : <Save />}
                  variant="contained"
                  onClick={async () => {
                    const success = await handleUpdate(editingUserId);
                    if (success) {
                      setEditingUserId(null);
                    }
                  }}
                  disabled={savingId === editingUserId || currentUserId === editingUserId}
                  fullWidth={isMobile}
                >
                  {savingId === editingUserId ? 'Saving…' : 'Save user'}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingUserDelete)}
        title={`Delete ${pendingUserDelete?.name ?? 'this user'}?`}
        description="This removes the account and its access permanently."
        confirmLabel="Delete user"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingUserDelete(null)}
        loading={confirmLoading}
      />
    </Stack>
  );
}
