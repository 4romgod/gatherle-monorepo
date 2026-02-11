'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Save, Delete } from '@mui/icons-material';
import { useAppContext } from '@/hooks';
import { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import {
  GetAllEventCategoryGroupsDocument,
  GetAllEventCategoryGroupsQuery,
  GetAllEventCategoriesDocument,
  GetAllEventCategoriesQuery,
} from '@/data/graphql/types/graphql';
import {
  CreateEventCategoryGroupDocument,
  UpdateEventCategoryGroupDocument,
  DeleteEventCategoryGroupBySlugDocument,
} from '@/data/graphql/query/EventCategoryGroup/mutation';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

type GroupForm = {
  name: string;
  eventCategories: string[];
};

const DEFAULT_GROUP_FORM: GroupForm = {
  name: '',
  eventCategories: [],
};

export default function AdminCategoryGroupSection({ token }: AdminSectionProps) {
  const { setToastProps } = useAppContext();
  const { data, error, refetch } = useQuery<GetAllEventCategoryGroupsQuery>(GetAllEventCategoryGroupsDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });

  const { data: categoriesData } = useQuery<GetAllEventCategoriesQuery>(GetAllEventCategoriesDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const categories = categoriesData?.readEventCategories ?? [];
  const [groupForm, setGroupForm] = useState<GroupForm>(DEFAULT_GROUP_FORM);
  const [groupState, setGroupState] = useState<Record<string, GroupForm>>({});
  const [creating, setCreating] = useState(false);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [pendingGroupDelete, setPendingGroupDelete] = useState<{ slug: string; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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
      return;
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
    } catch {
      notify('Unable to create group.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (groupId: string, slug: string) => {
    const payload = groupState[slug];
    if (!payload) {
      return;
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
    } catch {
      notify('Unable to update group.', 'error');
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
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Category groups
        </Typography>
        <Typography color="text.secondary">Group related categories together to drive curated navigation.</Typography>
      </Box>

      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Typography variant="h6">Create group</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Name"
                  value={groupForm.name}
                  fullWidth
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
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
              <Grid size={{ xs: 12 }}>
                <Button
                  startIcon={creating ? <CircularProgress size={16} /> : <Add />}
                  variant="contained"
                  color="secondary"
                  onClick={handleCreate}
                  disabled={creating}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Create group
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingGroupDelete)}
        title={`Delete ${pendingGroupDelete?.name ?? 'this group'}?`}
        description="Removing a category group will also unassign its categories from curated groupings."
        confirmLabel="Delete group"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingGroupDelete(null)}
        loading={confirmLoading}
      />

      {data?.readEventCategoryGroups?.map((group) => {
        const state = groupState[group.slug];
        return (
          <Card
            key={group.slug}
            elevation={0}
            sx={{ borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={{ xs: 1.5, sm: 0 }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {group.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.slug}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', sm: 'auto' }}>
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
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Save />}
                      onClick={() => handleUpdate(group.eventCategoryGroupId, group.slug)}
                      disabled={!state || savingSlug === group.slug}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {savingSlug === group.slug ? 'Saving' : 'Save'}
                    </Button>
                  </Stack>
                </Stack>
                <Divider />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Name"
                      value={state?.name ?? ''}
                      fullWidth
                      onChange={(event) =>
                        setGroupState((prev) => ({
                          ...prev,
                          [group.slug]: {
                            ...(prev[group.slug] ?? state ?? DEFAULT_GROUP_FORM),
                            name: event.target.value,
                          },
                        }))
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <FormControl fullWidth>
                      <Select
                        multiple
                        value={state?.eventCategories ?? []}
                        onChange={(event) =>
                          setGroupState((prev) => ({
                            ...prev,
                            [group.slug]: {
                              ...(prev[group.slug] ?? state ?? DEFAULT_GROUP_FORM),
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
                            <Checkbox checked={(state?.eventCategories ?? []).includes(category.eventCategoryId)} />
                            <ListItemText primary={category.name} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
