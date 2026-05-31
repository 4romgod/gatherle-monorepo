'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
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
  CreateOrganizationDocument,
  GetOrganizationsDocument,
  UpdateOrganizationDocument,
  DeleteOrganizationDocument,
} from '@/data/graphql/query';
import { EventVisibility, SortOrderInput } from '@/data/graphql/types/graphql';
import type { AdminOrganizationPreview, AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { useAppContext } from '@/hooks/useAppContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import AdminOrganizationMembersDialog from '@/components/admin/AdminOrganizationMembersDialog';
import {
  ADMIN_SURFACE_SX,
  AdminEmptyState,
  AdminListFooter,
  AdminListSearchField,
  AdminSectionHeader,
} from '@/components/admin/admin-ui';

type AdminOrganizationsSectionProps = AdminSectionProps & {
  currentUserId?: string | null;
};

type OrganizationFormState = {
  name: string;
  description: string;
  billingEmail: string;
  tags: string;
  domainsAllowed: string;
  defaultVisibility: EventVisibility;
};

type OrganizationCreateState = OrganizationFormState;

const PAGE_SIZE = 12;

const INITIAL_CREATE_STATE: OrganizationCreateState = {
  name: '',
  description: '',
  billingEmail: '',
  tags: '',
  domainsAllowed: '',
  defaultVisibility: EventVisibility.Public,
};

function parseCommaSeparated(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildOrganizationQueryOptions(searchQuery: string, limit: number, skip = 0) {
  const trimmedQuery = searchQuery.trim();

  return {
    pagination: { limit, skip },
    sort: [{ field: 'name', order: SortOrderInput.Asc }],
    ...(trimmedQuery.length >= 2
      ? {
          search: {
            value: trimmedQuery,
            fields: ['name', 'slug', 'description', 'billingEmail', 'tags', 'domainsAllowed'],
          },
        }
      : {}),
  };
}

function buildOrganizationFormState(organization: {
  name?: string | null;
  description?: string | null;
  billingEmail?: string | null;
  tags?: string[] | null;
  domainsAllowed?: string[] | null;
  defaultVisibility?: EventVisibility | null;
}): OrganizationFormState {
  return {
    name: organization.name ?? '',
    description: organization.description ?? '',
    billingEmail: organization.billingEmail ?? '',
    tags: organization.tags?.join(', ') ?? '',
    domainsAllowed: organization.domainsAllowed?.join(', ') ?? '',
    defaultVisibility: organization.defaultVisibility ?? EventVisibility.Public,
  };
}

export default function AdminOrganizationsSection({ token, currentUserId }: AdminOrganizationsSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const canCreateOrganizations = Boolean(currentUserId);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [formState, setFormState] = useState<Record<string, OrganizationFormState>>({});
  const [selectedOrganization, setSelectedOrganization] = useState<AdminOrganizationPreview | null>(null);
  const [editingOrganizationId, setEditingOrganizationId] = useState<string | null>(null);
  const [savingOrgId, setSavingOrgId] = useState<string | null>(null);
  const [pendingDeleteOrganization, setPendingDeleteOrganization] = useState<AdminOrganizationPreview | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createState, setCreateState] = useState<OrganizationCreateState>(INITIAL_CREATE_STATE);

  const queryOptions = useMemo(
    () => buildOrganizationQueryOptions(debouncedSearchQuery, PAGE_SIZE, 0),
    [debouncedSearchQuery],
  );

  const { data, loading, error, refetch, fetchMore } = useQuery(GetOrganizationsDocument, {
    variables: {
      options: queryOptions,
    },
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const organizations = useMemo(() => data?.readOrganizations ?? [], [data]);
  const editingOrganization = editingOrganizationId
    ? (organizations.find((organization) => organization.orgId === editingOrganizationId) ?? null)
    : null;

  const [createOrganization] = useMutation(CreateOrganizationDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateOrganization] = useMutation(UpdateOrganizationDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteOrganization] = useMutation(DeleteOrganizationDocument, {
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
      organizations.forEach((organization) => {
        if (!nextState[organization.orgId]) {
          nextState[organization.orgId] = buildOrganizationFormState(organization);
          changed = true;
        }
      });
      return changed ? nextState : prev;
    });
  }, [organizations]);

  useEffect(() => {
    if (!loading) {
      setHasMore(organizations.length >= PAGE_SIZE);
    }
  }, [loading, organizations.length]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const refreshOrganizations = async () => {
    const requestedLimit = Math.max(organizations.length, PAGE_SIZE);
    const result = await refetch({
      options: buildOrganizationQueryOptions(debouncedSearchQuery, requestedLimit, 0),
    });
    const refreshedItems = result.data?.readOrganizations ?? [];
    setHasMore(refreshedItems.length >= requestedLimit);
  };

  const openEditDialog = (organization: (typeof organizations)[number]) => {
    setFormState((prev) => ({
      ...prev,
      [organization.orgId]: buildOrganizationFormState(organization),
    }));
    setEditingOrganizationId(organization.orgId);
  };

  const handleSaveOrganization = async (organization: AdminOrganizationPreview) => {
    const payload = formState[organization.orgId];
    if (!payload) {
      return false;
    }

    setSavingOrgId(organization.orgId);
    try {
      await updateOrganization({
        variables: {
          input: {
            orgId: organization.orgId,
            name: payload.name.trim(),
            description: payload.description.trim() || null,
            billingEmail: payload.billingEmail.trim() || null,
            tags: parseCommaSeparated(payload.tags),
            domainsAllowed: parseCommaSeparated(payload.domainsAllowed),
            defaultVisibility: payload.defaultVisibility,
          },
        },
      });
      await refreshOrganizations();
      notify('Organization updated.');
      return true;
    } catch {
      notify('Unable to update this organization.', 'error');
      return false;
    } finally {
      setSavingOrgId(null);
    }
  };

  const handleCreateOrganization = async () => {
    if (!createState.name.trim()) {
      notify('Organization name is required.', 'error');
      return;
    }

    if (!currentUserId) {
      notify('Your admin session is missing a user id. Refresh and try again.', 'error');
      return;
    }

    setCreateLoading(true);
    try {
      await createOrganization({
        variables: {
          input: {
            ownerId: currentUserId,
            name: createState.name.trim(),
            description: createState.description.trim() || null,
            billingEmail: createState.billingEmail.trim() || null,
            tags: parseCommaSeparated(createState.tags),
            domainsAllowed: parseCommaSeparated(createState.domainsAllowed),
            defaultVisibility: createState.defaultVisibility,
          },
        },
      });
      await refreshOrganizations();
      setCreateState(INITIAL_CREATE_STATE);
      setCreateDialogOpen(false);
      notify('Organization created.');
    } catch {
      notify('Unable to create this organization.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteOrganization) {
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteOrganization({
        variables: {
          orgId: pendingDeleteOrganization.orgId,
        },
      });
      await refreshOrganizations();
      notify('Organization deleted.');
      setPendingDeleteOrganization(null);
    } catch {
      notify('Unable to delete this organization.', 'error');
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
          options: buildOrganizationQueryOptions(debouncedSearchQuery, PAGE_SIZE, organizations.length),
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
      setHasMore(nextBatchCount === PAGE_SIZE);
    } catch {
      notify('Unable to load more organizations.', 'error');
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
    return <Typography color="error">Unable to load organizations right now.</Typography>;
  }

  return (
    <>
      <Stack spacing={3}>
        <AdminSectionHeader
          title="Organizations"
          description="Repair organization metadata, manage access, and keep ownership structures tidy."
          meta={
            <Chip
              size="small"
              label={debouncedSearchQuery ? `${organizations.length} matches` : `${organizations.length} loaded`}
            />
          }
          actions={
            <Button
              startIcon={<AddRoundedIcon />}
              variant="contained"
              size="small"
              onClick={() => setCreateDialogOpen(true)}
              disabled={!canCreateOrganizations}
            >
              Create organization
            </Button>
          }
        />

        <AdminListSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search organizations by name, slug, description, billing email, or domain"
          helperText="Type at least 2 characters to narrow the organization list."
        />

        {loading && organizations.length === 0 ? (
          <Stack spacing={2}>
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} variant="rounded" height={220} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : organizations.length === 0 ? (
          <AdminEmptyState
            title={debouncedSearchQuery ? 'No matching organizations' : 'No organizations found'}
            description={
              debouncedSearchQuery
                ? 'Try another name, slug, billing email, or allowed domain.'
                : 'Organizations will appear here once they are created.'
            }
          />
        ) : (
          <Stack spacing={2}>
            {organizations.map((organization) => {
              const ownerMembership =
                organization.memberRoles?.find(
                  (membership) => membership.role === 'Owner' || membership.userId === organization.ownerId,
                ) ?? null;
              const ownerLabel = ownerMembership?.username ? `@${ownerMembership.username}` : organization.ownerId;

              return (
                <Card key={organization.orgId} elevation={0} sx={ADMIN_SURFACE_SX}>
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
                            {organization.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /{organization.slug}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip size="small" variant="outlined" label={`Owner · ${ownerLabel}`} />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={organization.defaultVisibility ?? EventVisibility.Public}
                            />
                            {organization.billingEmail ? (
                              <Chip size="small" variant="outlined" label={organization.billingEmail} />
                            ) : null}
                          </Stack>
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', lg: 'auto' }}>
                          <Button
                            startIcon={<GroupRoundedIcon />}
                            variant="outlined"
                            size="small"
                            onClick={() =>
                              setSelectedOrganization({
                                orgId: organization.orgId,
                                ownerId: organization.ownerId,
                                slug: organization.slug,
                                name: organization.name,
                                description: organization.description,
                                billingEmail: organization.billingEmail,
                                tags: organization.tags,
                                domainsAllowed: organization.domainsAllowed,
                              })
                            }
                          >
                            Members
                          </Button>
                          <Button
                            startIcon={<EditRoundedIcon />}
                            variant="outlined"
                            size="small"
                            onClick={() => openEditDialog(organization)}
                          >
                            Edit
                          </Button>
                          <Button
                            startIcon={<DeleteRoundedIcon />}
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() =>
                              setPendingDeleteOrganization({
                                orgId: organization.orgId,
                                ownerId: organization.ownerId,
                                slug: organization.slug,
                                name: organization.name,
                                description: organization.description,
                                billingEmail: organization.billingEmail,
                                tags: organization.tags,
                                domainsAllowed: organization.domainsAllowed,
                              })
                            }
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>

                      {organization.description ? (
                        <Typography variant="body2" color="text.secondary">
                          {organization.description}
                        </Typography>
                      ) : null}

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {(organization.tags ?? []).slice(0, 4).map((tag) => (
                          <Chip key={tag} size="small" variant="outlined" label={tag} />
                        ))}
                        {(organization.domainsAllowed ?? []).slice(0, 3).map((domain) => (
                          <Chip key={domain} size="small" variant="outlined" label={domain} />
                        ))}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}

            <AdminListFooter
              label="organization"
              loadedCount={organizations.length}
              hasMore={hasMore}
              loadingMore={loadingMore}
              sentinelRef={infiniteScrollRef}
            />
          </Stack>
        )}
      </Stack>

      <Dialog
        open={Boolean(editingOrganizationId)}
        onClose={() => setEditingOrganizationId(null)}
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
                Edit organization
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {editingOrganization?.name ?? 'Organization'}
              </Typography>
            </Stack>
            <IconButton onClick={() => setEditingOrganizationId(null)} aria-label="Close edit organization">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          {editingOrganizationId && editingOrganization ? (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Name"
                  value={formState[editingOrganizationId]?.name ?? editingOrganization.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingOrganizationId]: {
                        ...(prev[editingOrganizationId] ?? buildOrganizationFormState(editingOrganization)),
                        name: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Billing email"
                  value={formState[editingOrganizationId]?.billingEmail ?? editingOrganization.billingEmail ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingOrganizationId]: {
                        ...(prev[editingOrganizationId] ?? buildOrganizationFormState(editingOrganization)),
                        billingEmail: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </Stack>

              <TextField
                label="Description"
                value={formState[editingOrganizationId]?.description ?? editingOrganization.description ?? ''}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    [editingOrganizationId]: {
                      ...(prev[editingOrganizationId] ?? buildOrganizationFormState(editingOrganization)),
                      description: event.target.value,
                    },
                  }))
                }
                size="small"
                fullWidth
                multiline
                minRows={3}
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Tags"
                  value={formState[editingOrganizationId]?.tags ?? editingOrganization.tags?.join(', ') ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingOrganizationId]: {
                        ...(prev[editingOrganizationId] ?? buildOrganizationFormState(editingOrganization)),
                        tags: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                  helperText="Comma-separated discovery tags."
                />
                <TextField
                  label="Allowed domains"
                  value={
                    formState[editingOrganizationId]?.domainsAllowed ??
                    editingOrganization.domainsAllowed?.join(', ') ??
                    ''
                  }
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingOrganizationId]: {
                        ...(prev[editingOrganizationId] ?? buildOrganizationFormState(editingOrganization)),
                        domainsAllowed: event.target.value,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                  helperText="Comma-separated email domains."
                />
              </Stack>

              <Stack spacing={1} sx={{ width: '100%', maxWidth: { md: 360 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Default event visibility
                </Typography>
                <Select
                  value={
                    formState[editingOrganizationId]?.defaultVisibility ??
                    editingOrganization.defaultVisibility ??
                    EventVisibility.Public
                  }
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [editingOrganizationId]: {
                        ...(prev[editingOrganizationId] ?? buildOrganizationFormState(editingOrganization)),
                        defaultVisibility: event.target.value as EventVisibility,
                      },
                    }))
                  }
                  size="small"
                  fullWidth
                >
                  {Object.values(EventVisibility).map((visibility) => (
                    <MenuItem key={visibility} value={visibility}>
                      {visibility}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => setEditingOrganizationId(null)} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button
                  startIcon={
                    savingOrgId === editingOrganizationId ? <CircularProgress size={16} /> : <SaveRoundedIcon />
                  }
                  variant="contained"
                  onClick={async () => {
                    const success = await handleSaveOrganization({
                      orgId: editingOrganization.orgId,
                      ownerId: editingOrganization.ownerId,
                      slug: editingOrganization.slug,
                      name: editingOrganization.name,
                      description: editingOrganization.description,
                      billingEmail: editingOrganization.billingEmail,
                      tags: editingOrganization.tags,
                      domainsAllowed: editingOrganization.domainsAllowed,
                    });
                    if (success) {
                      setEditingOrganizationId(null);
                    }
                  }}
                  disabled={savingOrgId === editingOrganizationId}
                  fullWidth={isMobile}
                >
                  {savingOrgId === editingOrganizationId ? 'Saving…' : 'Save organization'}
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
                Create organization
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                New organization
              </Typography>
            </Stack>
            <IconButton onClick={() => setCreateDialogOpen(false)} aria-label="Close create organization">
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
              label="Billing email"
              value={createState.billingEmail}
              onChange={(event) => setCreateState((prev) => ({ ...prev, billingEmail: event.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Description"
              value={createState.description}
              onChange={(event) => setCreateState((prev) => ({ ...prev, description: event.target.value }))}
              size="small"
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              label="Tags"
              value={createState.tags}
              onChange={(event) => setCreateState((prev) => ({ ...prev, tags: event.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Allowed domains"
              value={createState.domainsAllowed}
              onChange={(event) => setCreateState((prev) => ({ ...prev, domainsAllowed: event.target.value }))}
              size="small"
              fullWidth
            />
            <Select
              value={createState.defaultVisibility}
              onChange={(event) =>
                setCreateState((prev) => ({ ...prev, defaultVisibility: event.target.value as EventVisibility }))
              }
              size="small"
              fullWidth
            >
              {Object.values(EventVisibility).map((visibility) => (
                <MenuItem key={visibility} value={visibility}>
                  {visibility}
                </MenuItem>
              ))}
            </Select>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => setCreateDialogOpen(false)} fullWidth={isMobile}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={() => void handleCreateOrganization()}
                disabled={createLoading || !canCreateOrganizations}
                fullWidth={isMobile}
              >
                {createLoading ? 'Creating…' : 'Create organization'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteOrganization)}
        title={`Delete ${pendingDeleteOrganization?.name ?? 'this organization'}?`}
        description="This removes the organization and its dependent access records."
        confirmLabel="Delete organization"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteOrganization(null)}
        loading={confirmLoading}
      />

      <AdminOrganizationMembersDialog
        open={Boolean(selectedOrganization)}
        organization={selectedOrganization}
        token={token}
        onClose={() => setSelectedOrganization(null)}
        onOrganizationChanged={() => refreshOrganizations()}
      />
    </>
  );
}
