'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import {
  Button,
  Card,
  CardContent,
  Chip,
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
  CreateOrganizationMembershipDocument,
  DeleteOrganizationMembershipDocument,
  GetOrganizationMembershipsByOrgIdDocument,
  GetUsersDocument,
  TransferOrganizationOwnershipDocument,
  UpdateOrganizationMembershipDocument,
} from '@/data/graphql/query';
import { OrganizationRole, SortOrderInput } from '@/data/graphql/types/graphql';
import type { AdminOrganizationPreview } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { useAppContext } from '@/hooks/useAppContext';
import { ADMIN_SURFACE_SX, AdminEmptyState } from '@/components/admin/admin-ui';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

type AdminOrganizationMembersDialogProps = {
  open: boolean;
  organization: AdminOrganizationPreview | null;
  token?: string | null;
  onClose: () => void;
  onOrganizationChanged?: () => void | Promise<void>;
};

const DEFAULT_ROLE = OrganizationRole.Member;

function buildUserSearchOptions(searchQuery: string) {
  return {
    pagination: { limit: 10 },
    sort: [{ field: 'username', order: SortOrderInput.Asc }],
    search: {
      value: searchQuery,
      fields: ['username', 'email', 'given_name', 'family_name'],
    },
  };
}

export default function AdminOrganizationMembersDialog({
  open,
  organization,
  token,
  onClose,
  onOrganizationChanged,
}: AdminOrganizationMembersDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [candidateRole, setCandidateRole] = useState<OrganizationRole>(DEFAULT_ROLE);
  const [membershipRoleState, setMembershipRoleState] = useState<Record<string, OrganizationRole>>({});
  const [savingMembershipId, setSavingMembershipId] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [pendingDeleteMembership, setPendingDeleteMembership] = useState<{
    membershipId: string;
    username: string;
  } | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<{ userId: string; username: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const orgId = organization?.orgId ?? '';

  const { data, loading, error, refetch } = useQuery(GetOrganizationMembershipsByOrgIdDocument, {
    variables: orgId ? { orgId } : undefined,
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    skip: !open || !orgId,
  });

  const [searchUsers, { data: usersData, loading: searchLoading }] = useLazyQuery(GetUsersDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'network-only',
  });

  const [createMembership] = useMutation(CreateOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateMembership] = useMutation(UpdateOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteMembership] = useMutation(DeleteOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [transferOwnership] = useMutation(TransferOrganizationOwnershipDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const memberships = data?.readOrganizationMembershipsByOrgId ?? [];
  const existingUserIds = useMemo(() => new Set(memberships.map((membership) => membership.userId)), [memberships]);
  const searchResults = useMemo(
    () => (usersData?.readUsers ?? []).filter((user) => user.userId && !existingUserIds.has(user.userId)),
    [existingUserIds, usersData],
  );

  useEffect(() => {
    setMembershipRoleState((prev) => {
      const nextState: Record<string, OrganizationRole> = {};

      memberships.forEach((membership) => {
        nextState[membership.membershipId] = prev[membership.membershipId] ?? membership.role;
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextState);

      if (prevKeys.length !== nextKeys.length) {
        return nextState;
      }

      const hasChanges = nextKeys.some((membershipId) => prev[membershipId] !== nextState[membershipId]);
      return hasChanges ? nextState : prev;
    });
  }, [memberships]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setCandidateRole(DEFAULT_ROLE);
      setSavingMembershipId(null);
      setAddingUserId(null);
      setPendingDeleteMembership(null);
      setPendingTransfer(null);
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void searchUsers({
        variables: {
          options: buildUserSearchOptions(trimmed),
        },
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [open, searchQuery, searchUsers]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshMemberships = async () => {
    if (!orgId) {
      return;
    }
    await refetch({ orgId });
  };

  const handleAddMember = async (userId: string) => {
    if (!orgId) {
      return;
    }

    setAddingUserId(userId);
    try {
      await createMembership({
        variables: {
          input: {
            orgId,
            userId,
            role: candidateRole,
          },
        },
      });
      await refreshMemberships();
      setSearchQuery('');
      notify('Organization member added.');
    } catch {
      notify('Unable to add this member.', 'error');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleSaveMembership = async (membershipId: string) => {
    const role = membershipRoleState[membershipId];
    if (!role) {
      return;
    }

    setSavingMembershipId(membershipId);
    try {
      await updateMembership({
        variables: {
          input: {
            membershipId,
            role,
          },
        },
      });
      await refreshMemberships();
      notify('Membership updated.');
    } catch {
      notify('Unable to update this membership.', 'error');
    } finally {
      setSavingMembershipId(null);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!pendingTransfer || !orgId) {
      return;
    }

    setTransferLoading(true);
    try {
      await transferOwnership({
        variables: {
          orgId,
          newOwnerUserId: pendingTransfer.userId,
        },
      });
      await refreshMemberships();
      await onOrganizationChanged?.();
      notify(`Ownership transferred to @${pendingTransfer.username}.`);
      setPendingTransfer(null);
    } catch {
      notify('Unable to transfer ownership.', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteMembership) {
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteMembership({
        variables: {
          input: {
            membershipId: pendingDeleteMembership.membershipId,
          },
        },
      });
      await refreshMemberships();
      notify('Membership removed.');
      setPendingDeleteMembership(null);
    } catch {
      notify('Unable to remove this member.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
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
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Stack spacing={0.6} minWidth={0}>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.12em' }}>
                Organization members
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {organization?.name ?? 'Organization'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review roles, add members, and clean up organization access.
              </Typography>
            </Stack>

            <IconButton onClick={onClose} aria-label="Close organization members" size="small">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', md: 'flex-start' }}
              sx={{ ...ADMIN_SURFACE_SX, p: { xs: 2, md: 2.5 } }}
            >
              <TextField
                label="Find user"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, username, or email"
                fullWidth
                size="small"
              />
              <Select
                value={candidateRole}
                onChange={(event) => setCandidateRole(event.target.value as OrganizationRole)}
                size="small"
                sx={{ minWidth: { xs: '100%', md: 170 } }}
              >
                {Object.values(OrganizationRole)
                  .filter((role) => role !== OrganizationRole.Owner)
                  .map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
              </Select>
            </Stack>

            {searchQuery.trim().length >= 2 ? (
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={800}>
                  User matches
                </Typography>
                {searchLoading ? (
                  <Stack spacing={1}>
                    {[...Array(2)].map((_, index) => (
                      <Skeleton key={index} variant="rounded" height={86} sx={{ borderRadius: 2 }} />
                    ))}
                  </Stack>
                ) : searchResults.length === 0 ? (
                  <AdminEmptyState
                    title="No eligible users found"
                    description="Try a different search or this user is already a member of the organization."
                  />
                ) : (
                  <Stack spacing={1}>
                    {searchResults.map((user) => (
                      <Card key={user.userId} elevation={0} sx={ADMIN_SURFACE_SX}>
                        <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                          >
                            <Stack spacing={0.35}>
                              <Typography variant="subtitle2" fontWeight={800}>
                                {[user.given_name, user.family_name].filter(Boolean).join(' ') || user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                @{user.username}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {user.email}
                              </Typography>
                            </Stack>

                            <Button
                              startIcon={<PersonAddAlt1RoundedIcon />}
                              variant="contained"
                              size="small"
                              disabled={addingUserId === user.userId}
                              onClick={() => void handleAddMember(user.userId)}
                            >
                              {addingUserId === user.userId ? 'Adding…' : `Add as ${candidateRole}`}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            ) : null}

            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" fontWeight={800}>
                  Current members
                </Typography>
                <Chip size="small" label={`${memberships.length} member${memberships.length === 1 ? '' : 's'}`} />
              </Stack>

              {loading ? (
                <Stack spacing={1}>
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} variant="rounded" height={112} sx={{ borderRadius: 2 }} />
                  ))}
                </Stack>
              ) : error ? (
                <Typography color="error">Unable to load organization members.</Typography>
              ) : memberships.length === 0 ? (
                <AdminEmptyState
                  title="No memberships yet"
                  description="Add a user above to start delegating organization access."
                />
              ) : (
                <Stack spacing={1.25}>
                  {memberships.map((membership) => (
                    <Card key={membership.membershipId} elevation={0} sx={ADMIN_SURFACE_SX}>
                      <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
                        <Stack spacing={1.5}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            spacing={1}
                          >
                            <Stack spacing={0.35}>
                              <Typography variant="subtitle2" fontWeight={800}>
                                {membership.username ? `@${membership.username}` : membership.userId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {membership.userId}
                              </Typography>
                            </Stack>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip size="small" variant="outlined" label={membership.role} />
                              {membership.role === OrganizationRole.Owner ? (
                                <Chip size="small" color="primary" label="Owner" />
                              ) : null}
                            </Stack>
                          </Stack>

                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                          >
                            {membership.role !== OrganizationRole.Owner ? (
                              <>
                                <Select
                                  value={membershipRoleState[membership.membershipId] ?? membership.role}
                                  onChange={(event) =>
                                    setMembershipRoleState((prev) => ({
                                      ...prev,
                                      [membership.membershipId]: event.target.value as OrganizationRole,
                                    }))
                                  }
                                  size="small"
                                  sx={{ minWidth: { xs: '100%', sm: 180 } }}
                                >
                                  {Object.values(OrganizationRole)
                                    .filter((role) => role !== OrganizationRole.Owner)
                                    .map((role) => (
                                      <MenuItem key={role} value={role}>
                                        {role}
                                      </MenuItem>
                                    ))}
                                </Select>
                                <Button
                                  startIcon={<SaveRoundedIcon />}
                                  variant="outlined"
                                  size="small"
                                  disabled={savingMembershipId === membership.membershipId}
                                  onClick={() => void handleSaveMembership(membership.membershipId)}
                                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                                >
                                  {savingMembershipId === membership.membershipId ? 'Saving…' : 'Save role'}
                                </Button>
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() =>
                                    setPendingTransfer({
                                      userId: membership.userId,
                                      username: membership.username ?? membership.userId,
                                    })
                                  }
                                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                                >
                                  Make owner
                                </Button>
                                <Button
                                  startIcon={<DeleteOutlineRoundedIcon />}
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={() =>
                                    setPendingDeleteMembership({
                                      membershipId: membership.membershipId,
                                      username: membership.username ?? membership.userId,
                                    })
                                  }
                                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                                >
                                  Remove
                                </Button>
                              </>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Owner role cannot be edited or removed directly. Use “Make owner” on another member to
                                transfer ownership.
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteMembership)}
        title={`Remove ${pendingDeleteMembership?.username ?? 'this member'}?`}
        description="This removes the user from the organization access list."
        confirmLabel="Remove member"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteMembership(null)}
        loading={confirmLoading}
      />

      <ConfirmDialog
        open={Boolean(pendingTransfer)}
        title={`Transfer ownership to @${pendingTransfer?.username ?? 'this member'}?`}
        description="The current owner will be demoted to Admin. The new owner will gain full control of this organization."
        confirmLabel="Transfer ownership"
        onConfirm={handleConfirmTransfer}
        onCancel={() => setPendingTransfer(null)}
        loading={transferLoading}
      />
    </>
  );
}
