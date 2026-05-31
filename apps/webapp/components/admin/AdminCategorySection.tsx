'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Delete, Edit, Save } from '@mui/icons-material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useAppContext } from '@/hooks';
import { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { GetEventCategoriesDocument } from '@/data/graphql/query/EventCategory/query';
import {
  CreateEventCategoryDocument,
  UpdateEventCategoryDocument,
  DeleteEventCategoryByIdDocument,
} from '@/data/graphql/query/EventCategory/mutation';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { EventCategory } from '@/data/graphql/types/graphql';
import { ADMIN_SURFACE_SX, AdminEmptyState, AdminSectionHeader } from './admin-ui';

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  iconName: string;
  color: string;
};

const DEFAULT_CATEGORY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  iconName: '',
  color: '#',
};

export default function AdminCategorySection({ token }: AdminSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setToastProps } = useAppContext();
  const { data, loading, error, refetch } = useQuery(GetEventCategoriesDocument, {
    context: { headers: getAuthHeader(token) },
    fetchPolicy: 'cache-and-network',
  });
  const categories: EventCategory[] = data?.readEventCategories ?? [];

  const [newCategory, setNewCategory] = useState<CategoryForm>(DEFAULT_CATEGORY_FORM);
  const [categoryState, setCategoryState] = useState<Record<string, CategoryForm>>({});
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [createCategory] = useMutation(CreateEventCategoryDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateCategory] = useMutation(UpdateEventCategoryDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteCategory] = useMutation(DeleteEventCategoryByIdDocument, {
    context: { headers: getAuthHeader(token) },
  });

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }
    const nextState: Record<string, CategoryForm> = {};
    categories.forEach((category) => {
      nextState[category.eventCategoryId] = {
        name: category.name ?? '',
        slug: category.slug ?? '',
        description: category.description ?? '',
        iconName: category.iconName ?? '',
        color: category.color ?? '',
      };
    });
    setCategoryState(nextState);
  }, [categories]);

  const notify = (message: string, severity: 'success' | 'error' = 'success') => {
    setToastProps((prev) => ({
      ...prev,
      open: true,
      message,
      severity,
    }));
  };

  const handleCreate = async () => {
    if (!newCategory.name || !newCategory.description || !newCategory.iconName) {
      notify('Name, description, and icon are required.', 'error');
      return false;
    }

    setCreating(true);
    try {
      await createCategory({
        variables: {
          input: {
            name: newCategory.name,
            description: newCategory.description,
            iconName: newCategory.iconName,
            color: newCategory.color || undefined,
          },
        },
      });
      await refetch();
      setNewCategory(DEFAULT_CATEGORY_FORM);
      notify('Category created.');
      return true;
    } catch {
      notify('Unable to create category.', 'error');
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (categoryId: string) => {
    const payload = categoryState[categoryId];
    if (!payload) {
      return false;
    }

    setSavingCategoryId(categoryId);
    try {
      await updateCategory({
        variables: {
          input: {
            eventCategoryId: categoryId,
            name: payload.name,
            description: payload.description,
            iconName: payload.iconName,
            color: payload.color || undefined,
          },
        },
      });
      await refetch();
      notify('Category saved.');
      return true;
    } catch {
      notify('Unable to save category.', 'error');
      return false;
    } finally {
      setSavingCategoryId(null);
    }
  };

  const requestDelete = (categoryId: string, name: string) => {
    setPendingCategoryDelete({ id: categoryId, name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingCategoryDelete) {
      return;
    }

    setConfirmLoading(true);
    try {
      await deleteCategory({ variables: { eventCategoryId: pendingCategoryDelete.id } });
      await refetch();
      notify('Category deleted.');
      setPendingCategoryDelete(null);
    } catch {
      notify('Unable to delete category.', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (error) {
    return <Typography color="error">Failed to load categories.</Typography>;
  }

  return (
    <Stack spacing={3}>
      <AdminSectionHeader
        title="Category management"
        description="Create, update, and prune the taxonomy that powers exploration across the app."
        actions={
          <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setCreateDialogOpen(true)}>
            Create category
          </Button>
        }
      />

      <ConfirmDialog
        open={Boolean(pendingCategoryDelete)}
        title={`Delete ${pendingCategoryDelete?.name ?? 'this category'}?`}
        description="This action cannot be undone."
        confirmLabel="Delete category"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingCategoryDelete(null)}
        loading={confirmLoading}
      />

      {loading ? (
        <Stack spacing={2}>
          {[...Array(2)].map((_, index) => (
            <Skeleton key={index} variant="rounded" height={220} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : categories.length === 0 ? (
        <AdminEmptyState
          title="No categories yet"
          description="Once you create categories they’ll appear here for maintenance and cleanup."
        />
      ) : (
        <Stack spacing={2}>
          {categories.map((category) => {
            return (
              <Card key={category.eventCategoryId} elevation={0} sx={ADMIN_SURFACE_SX}>
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
                          {category.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          /{category.slug}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {category.iconName ? (
                            <Chip size="small" variant="outlined" label={category.iconName} />
                          ) : null}
                          {category.color ? <Chip size="small" variant="outlined" label={category.color} /> : null}
                        </Stack>
                        {category.description ? (
                          <Typography variant="body2" color="text.secondary">
                            {category.description}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', sm: 'auto' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => setEditingCategoryId(category.eventCategoryId)}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => requestDelete(category.eventCategoryId, category.name ?? 'category')}
                          disabled={Boolean(pendingCategoryDelete)}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

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
                Create category
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                New category
              </Typography>
            </Stack>
            <IconButton onClick={() => setCreateDialogOpen(false)} aria-label="Close create category">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Name"
                  value={newCategory.name}
                  fullWidth
                  size="small"
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Icon name"
                  value={newCategory.iconName}
                  fullWidth
                  size="small"
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, iconName: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Color"
                  placeholder="#FF5733"
                  value={newCategory.color}
                  fullWidth
                  size="small"
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, color: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  value={newCategory.description}
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, description: event.target.value }))}
                />
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
                {creating ? 'Creating…' : 'Create category'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingCategoryId)}
        onClose={() => setEditingCategoryId(null)}
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
                Edit category
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {editingCategoryId
                  ? categories.find((category) => category.eventCategoryId === editingCategoryId)?.name
                  : 'Category'}
              </Typography>
            </Stack>
            <IconButton onClick={() => setEditingCategoryId(null)} aria-label="Close edit category">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          {editingCategoryId ? (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Name"
                    value={categoryState[editingCategoryId]?.name ?? ''}
                    fullWidth
                    size="small"
                    onChange={(event) =>
                      setCategoryState((prev) => ({
                        ...prev,
                        [editingCategoryId]: {
                          ...(prev[editingCategoryId] ?? DEFAULT_CATEGORY_FORM),
                          name: event.target.value,
                        },
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Slug"
                    value={categoryState[editingCategoryId]?.slug ?? ''}
                    fullWidth
                    size="small"
                    disabled
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Icon"
                    value={categoryState[editingCategoryId]?.iconName ?? ''}
                    fullWidth
                    size="small"
                    onChange={(event) =>
                      setCategoryState((prev) => ({
                        ...prev,
                        [editingCategoryId]: {
                          ...(prev[editingCategoryId] ?? DEFAULT_CATEGORY_FORM),
                          iconName: event.target.value,
                        },
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Color"
                    placeholder="#FF5733"
                    value={categoryState[editingCategoryId]?.color ?? ''}
                    fullWidth
                    size="small"
                    onChange={(event) =>
                      setCategoryState((prev) => ({
                        ...prev,
                        [editingCategoryId]: {
                          ...(prev[editingCategoryId] ?? DEFAULT_CATEGORY_FORM),
                          color: event.target.value,
                        },
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Description"
                    value={categoryState[editingCategoryId]?.description ?? ''}
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    onChange={(event) =>
                      setCategoryState((prev) => ({
                        ...prev,
                        [editingCategoryId]: {
                          ...(prev[editingCategoryId] ?? DEFAULT_CATEGORY_FORM),
                          description: event.target.value,
                        },
                      }))
                    }
                  />
                </Grid>
              </Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={() => setEditingCategoryId(null)} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button
                  startIcon={savingCategoryId === editingCategoryId ? <CircularProgress size={16} /> : <Save />}
                  variant="contained"
                  onClick={async () => {
                    const success = await handleUpdate(editingCategoryId);
                    if (success) {
                      setEditingCategoryId(null);
                    }
                  }}
                  disabled={savingCategoryId === editingCategoryId}
                  fullWidth={isMobile}
                >
                  {savingCategoryId === editingCategoryId ? 'Saving…' : 'Save category'}
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
