'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  ListItemText,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Delete, Edit, Save } from '@mui/icons-material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useAppContext } from '@/hooks';
import { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import {
  GetEventCategoryGroupsDocument,
  GetEventCategoryGroupsQuery,
  GetEventCategoriesDocument,
  GetEventCategoriesQuery,
} from '@/data/graphql/types/graphql';
import {
  CreateEventCategoryGroupDocument,
  UpdateEventCategoryGroupDocument,
  DeleteEventCategoryGroupBySlugDocument,
} from '@/data/graphql/query/EventCategoryGroup/mutation';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { ADMIN_SURFACE_SX, AdminEmptyState, AdminSectionHeader } from './admin-ui';

type GroupForm = {
  name: string;
  eventCategories: string[];
};

const DEFAULT_GROUP_FORM: GroupForm = {
  name: '',
  eventCategories: [],
};

export default function AdminCategoryGroupSection({ token }: AdminSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const { data, loading, error, refetch } = useQuery<GetEventCategoryGroupsQuery>(GetEventCategoryGroupsDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const { data: categoriesData } = useQuery<GetEventCategoriesQuery>(GetEventCategoriesDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const categories = categoriesData?.readEventCategories ?? [];
  const [groupForm, setGroupForm] = useState<GroupForm>(DEFAULT_GROUP_FORM);
  const [groupState, setGroupState] = useState<Record<string, GroupForm>>({});
  const [creating, setCreating] = useState(false);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [pendingGroupDelete, setPendingGroupDelete] = useState<{ slug: string; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGroupSlug, setEditingGroupSlug] = useState<string | null>(null);

  const [createGroup] = useMutation(CreateEventCategoryGroupDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateGroup] = useMutation(UpdateEventCategoryGroupDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteGroup] = useMutation(DeleteEventCategoryGroupBySlugDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    if (!data?.readEventCategoryGroups) {
      return;
    }
    const nextState: Record<string, GroupForm> = {};
    data.readEventCategoryGroups.forEach((group) => {
      nextState[group.slug] = {
        name: group.name ?? '',
        eventCategories: group.eventCategories?.map((category) => category.eventCategoryId) ?? [],
      };
    });
    setGroupState(nextState);
  }, [data]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const handleCreate = async () => {
    if (!groupForm.name || groupForm.eventCategories.length === 0) {
      notify('Provide a name and at least one category.', 'error');
      return false;
    }
    setCreating(true);
    try {
      await createGroup({
        variables: {
          input: {
            name: groupForm.name,
            eventCategories: groupForm.eventCategories,
          },
        },
      });
      await refetch();
      setGroupForm(DEFAULT_GROUP_FORM);
      notify('Category group created.');
      return true;
    } catch {
      notify('Unable to create group.', 'error');
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (groupId: string, slug: string) => {
    const payload = groupState[slug];
    if (!payload) {
      return false;
    }

    setSavingSlug(slug);
    try {
      await updateGroup({
        variables: {
          input: {
            eventCategoryGroupId: groupId,
            name: payload.name,
            eventCategories: payload.eventCategories,
          },
        },
      });
      await refetch();
      notify('Group updated.');
      return true;
    } catch {
      notify('Unable to update group.', 'error');
      return false;
    } finally {
      setSavingSlug(null);
    }
  };

  const requestDelete = (slug: string, name: string) => {
    setPendingGroupDelete({ slug, name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingGroupDelete) {
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteGroup({ variables: { slug: pendingGroupDelete.slug } });
      await refetch();
      notify('Group deleted.');
      setPendingGroupDelete(null);
    } catch {
      notify('Unable to delete group.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (error) {
    return <Typography color="error">We could not load category groups right now. Try again later.</Typography>;
  }

  return (
    <Stack spacing={3}>
      <AdminSectionHeader
        title="Category groups"
        description="Bundle related categories together for curated browse and discovery surfaces."
        actions={
          <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setCreateDialogOpen(true)}>
            Create group
          </Button>
        }
      />

      <ConfirmDialog
        open={Boolean(pendingGroupDelete)}
        title={`Delete ${pendingGroupDelete?.name ?? 'this group'}?`}
        description="Removing a category group will also unassign its categories from curated groupings."
        confirmLabel="Delete group"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingGroupDelete(null)}
        loading={confirmLoading}
      />

      {loading && (data?.readEventCategoryGroups?.length ?? 0) === 0 ? (
        <Stack spacing={2}>
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} variant="rounded" height={180} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : data?.readEventCategoryGroups?.length === 0 ? (
        <AdminEmptyState
          title="No groups yet"
          description="Create a group to cluster categories into curated collections."
        />
      ) : null}

      {data?.readEventCategoryGroups?.map((group) => {
        return (
          <Card key={group.slug} elevation={0} sx={ADMIN_SURFACE_SX}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={{ xs: 1.5, sm: 0 }}
                >
                  <Stack spacing={0.4}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {group.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.slug}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${group.eventCategories?.length ?? 0} categor${group.eventCategories?.length === 1 ? 'y' : 'ies'}`}
                      />
                    </Stack>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', sm: 'auto' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setEditingGroupSlug(group.slug)}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => requestDelete(group.slug, group.name ?? 'group')}
                      disabled={Boolean(pendingGroupDelete)}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Stack>
                {group.eventCategories?.length ? (
                  <Typography variant="body2" color="text.secondary">
                    {group.eventCategories.map((category) => category.name).join(', ')}
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
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
                Create group
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                New category group
              </Typography>
            </Stack>
            <IconButton onClick={() => setCreateDialogOpen(false)} aria-label="Close create group">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Name"
                  value={groupForm.name}
                  fullWidth
                  size="small"
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    displayEmpty
                    value={groupForm.eventCategories}
                    onChange={(event) =>
                      setGroupForm((prev) => ({
                        ...prev,
                        eventCategories: event.target.value as string[],
                      }))
                    }
                    renderValue={(selected) =>
                      selected.length === 0
                        ? 'Pick categories'
                        : categories
                            .filter((cat) => selected.includes(cat.eventCategoryId))
                            .map((cat) => cat.name)
                            .join(', ')
                    }
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.eventCategoryId} value={category.eventCategoryId}>
                        <Checkbox checked={groupForm.eventCategories.includes(category.eventCategoryId)} />
                        <ListItemText primary={category.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => setCreateDialogOpen(false)} fullWidth={isMobile}>
                Cancel
              </Button>
              <Button
                startIcon={creating ? <CircularProgress size={16} /> : <Add />}
                variant="contained"
                onClick={async () => {
                  const success = await handleCreate();
                  if (success) {
                    setCreateDialogOpen(false);
                  }
                }}
                disabled={creating}
                fullWidth={isMobile}
              >
                {creating ? 'Creating…' : 'Create group'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingGroupSlug)}
        onClose={() => setEditingGroupSlug(null)}
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
                Edit group
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {editingGroupSlug
                  ? data?.readEventCategoryGroups?.find((group) => group.slug === editingGroupSlug)?.name
                  : 'Group'}
              </Typography>
            </Stack>
            <IconButton onClick={() => setEditingGroupSlug(null)} aria-label="Close edit group">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          {editingGroupSlug ? (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Name"
                    value={groupState[editingGroupSlug]?.name ?? ''}
                    fullWidth
                    size="small"
                    onChange={(event) =>
                      setGroupState((prev) => ({
                        ...prev,
                        [editingGroupSlug]: {
                          ...(prev[editingGroupSlug] ?? DEFAULT_GROUP_FORM),
                          name: event.target.value,
                        },
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <Select
                      multiple
                      value={groupState[editingGroupSlug]?.eventCategories ?? []}
                      onChange={(event) =>
                        setGroupState((prev) => ({
                          ...prev,
                          [editingGroupSlug]: {
                            ...(prev[editingGroupSlug] ?? DEFAULT_GROUP_FORM),
                            eventCategories: event.target.value as string[],
                          },
                        }))
                      }
                      renderValue={(selected) =>
                        categories
                          .filter((cat) => (selected as string[]).includes(cat.eventCategoryId))
                          .map((cat) => cat.name)
                          .join(', ')
                      }
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.eventCategoryId} value={category.eventCategoryId}>
                          <Checkbox
                            checked={(groupState[editingGroupSlug]?.eventCategories ?? []).includes(
                              category.eventCategoryId,
                            )}
                          />
                          <ListItemText primary={category.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => setEditingGroupSlug(null)} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button
                  startIcon={savingSlug === editingGroupSlug ? <CircularProgress size={16} /> : <Save />}
                  variant="contained"
                  onClick={async () => {
                    const group = data?.readEventCategoryGroups?.find((entry) => entry.slug === editingGroupSlug);
                    if (!group) {
                      return;
                    }
                    const success = await handleUpdate(group.eventCategoryGroupId, editingGroupSlug);
                    if (success) {
                      setEditingGroupSlug(null);
                    }
                  }}
                  disabled={savingSlug === editingGroupSlug}
                  fullWidth={isMobile}
                >
                  {savingSlug === editingGroupSlug ? 'Saving…' : 'Save group'}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
