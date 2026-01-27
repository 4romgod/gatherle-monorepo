'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Skeleton,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Delete, Save } from '@mui/icons-material';
import { useAppContext } from '@/hooks';
import { AdminUsersSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { UserRole } from '@/data/graphql/types/graphql';
import { GetAllUsersDocument } from '@/data/graphql/query/User/query';
import { UpdateUserDocument, DeleteUserByIdDocument } from '@/data/graphql/query/User/mutation';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminUsersSection({ token, currentUserId }: AdminUsersSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const { data, loading, error, refetch } = useQuery(GetAllUsersDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });
  const users = data?.readUsers ?? [];
  const [roleState, setRoleState] = useState<Record<string, UserRole>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingUserDelete, setPendingUserDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [updateUser] = useMutation(UpdateUserDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteUser] = useMutation(DeleteUserByIdDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    if (users.length === 0) {
      return;
    }
    const nextState: Record<string, UserRole> = {};
    users.forEach((user) => {
      if (user.userId) {
        nextState[user.userId] = user.userRole ?? UserRole.User;
      }
    });
    setRoleState(nextState);
  }, [users]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const handleUpdate = async (userId: string) => {
    const nextRole = roleState[userId];
    if (!nextRole) {
      return;
    }

    setSavingId(userId);
    try {
      await updateUser({
        variables: {
          input: {
            userId,
            userRole: nextRole,
          },
        },
      });
      await refetch();
      notify('User role saved.');
    } catch {
      notify('Unable to save user.', 'error');
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
      await refetch();
      notify('User deleted.');
      setPendingUserDelete(null);
    } catch {
      notify('Unable to delete user.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (error) {
    return <Typography color="error">Unable to load users right now.</Typography>;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Users
        </Typography>
        <Typography color="text.secondary">
          Review every registered member and promote/demote roles as needed.
        </Typography>
      </Box>

      {loading ? (
        <Stack spacing={1}>
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={80} />
          ))}
        </Stack>
      ) : isMobile ? (
        <Stack spacing={2}>
          {users.map((user) => (
            <Card
              key={user.userId}
              elevation={0}
              sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {user.given_name} {user.family_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      @{user.username}
                    </Typography>
                    <Typography variant="body2">{user.email}</Typography>
                  </Stack>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Role
                    </Typography>
                    <Select
                      value={roleState[user.userId] || user.userRole || UserRole.User}
                      onChange={(event) =>
                        setRoleState((prev) => ({
                          ...prev,
                          [user.userId]: event.target.value as UserRole,
                        }))
                      }
                      size="small"
                      fullWidth
                    >
                      {Object.values(UserRole).map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </Select>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      startIcon={<Save />}
                      variant="outlined"
                      size="small"
                      onClick={() => handleUpdate(user.userId)}
                      disabled={savingId === user.userId}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {savingId === user.userId ? <CircularProgress size={16} /> : 'Save'}
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
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {user.given_name} {user.family_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      @{user.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Select
                        value={roleState[user.userId] || user.userRole || UserRole.User}
                        onChange={(event) =>
                          setRoleState((prev) => ({
                            ...prev,
                            [user.userId]: event.target.value as UserRole,
                          }))
                        }
                        size="small"
                      >
                        {Object.values(UserRole).map((role) => (
                          <MenuItem key={role} value={role}>
                            {role}
                          </MenuItem>
                        ))}
                      </Select>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        startIcon={<Save />}
                        variant="outlined"
                        size="small"
                        onClick={() => handleUpdate(user.userId)}
                        disabled={savingId === user.userId}
                      >
                        {savingId === user.userId ? <CircularProgress size={16} /> : 'Save'}
                      </Button>
                      <Button
                        startIcon={<Delete />}
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => requestDelete(user.userId, `${user.given_name} ${user.family_name}`)}
                        disabled={Boolean(pendingUserDelete) || currentUserId === user.userId}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={Boolean(pendingUserDelete)}
        title={`Delete ${pendingUserDelete?.name ?? 'this user'}?`}
        description="This removes the user and their access forever."
        confirmLabel="Delete user"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingUserDelete(null)}
        loading={confirmLoading}
      />
    </Stack>
  );
}
