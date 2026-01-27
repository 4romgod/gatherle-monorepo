'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Add, Save, Delete } from '@mui/icons-material';
import { useAppContext } from '@/hooks';
import { AdminSectionProps } from '@/components/admin/types';
import { getAuthHeader } from '@/lib/utils/auth';
import { GetAllEventCategoriesDocument } from '@/data/graphql/query/EventCategory/query';
import {
  CreateEventCategoryDocument,
  UpdateEventCategoryDocument,
  DeleteEventCategoryByIdDocument,
} from '@/data/graphql/query/EventCategory/mutation';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { EventCategory } from '@/data/graphql/types/graphql';

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
  const { setToastProps } = useAppContext();
  const { data, loading, error, refetch } = useQuery(GetAllEventCategoriesDocument, {
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
      return;
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
    } catch {
      notify('Unable to create category.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (categoryId: string) => {
    const payload = categoryState[categoryId];
    if (!payload) {
      return;
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
    } catch {
      notify('Unable to save category.', 'error');
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
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Event categories
        </Typography>
        <Typography color="text.secondary">Add, update, or remove categories that power the explorer.</Typography>
      </Box>

      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Typography variant="h6">Create new category</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Name"
                  value={newCategory.name}
                  fullWidth
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Slug"
                  value={newCategory.slug}
                  fullWidth
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, slug: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Icon name"
                  value={newCategory.iconName}
                  fullWidth
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, iconName: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Color"
                  placeholder="#FF5733"
                  value={newCategory.color}
                  fullWidth
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, color: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  value={newCategory.description}
                  fullWidth
                  multiline
                  minRows={2}
                  onChange={(event) => setNewCategory((prev) => ({ ...prev, description: event.target.value }))}
                />
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
                  Create category
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

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
            <Skeleton key={index} variant="rectangular" height={90} />
          ))}
        </Stack>
      ) : categories.length === 0 ? (
        <Typography color="text.secondary">No categories yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {categories.map((category) => {
            const state = categoryState[category.eventCategoryId];
            return (
              <Card
                key={category.eventCategoryId}
                elevation={0}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
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
                          {category.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.eventCategoryId}
                        </Typography>
                      </Box>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', sm: 'auto' }}>
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
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Save />}
                          onClick={() => handleUpdate(category.eventCategoryId)}
                          disabled={!state || savingCategoryId === category.eventCategoryId}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          {savingCategoryId === category.eventCategoryId ? 'Saving' : 'Save'}
                        </Button>
                      </Stack>
                    </Stack>
                    <Divider />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          label="Name"
                          value={state?.name ?? ''}
                          fullWidth
                          onChange={(event) =>
                            setCategoryState((prev) => ({
                              ...prev,
                              [category.eventCategoryId]: {
                                ...(prev[category.eventCategoryId] ?? state ?? DEFAULT_CATEGORY_FORM),
                                name: event.target.value,
                              },
                            }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          label="Slug"
                          value={state?.slug ?? ''}
                          fullWidth
                          onChange={(event) =>
                            setCategoryState((prev) => ({
                              ...prev,
                              [category.eventCategoryId]: {
                                ...(prev[category.eventCategoryId] ?? state ?? DEFAULT_CATEGORY_FORM),
                                slug: event.target.value,
                              },
                            }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          label="Icon"
                          value={state?.iconName ?? ''}
                          fullWidth
                          onChange={(event) =>
                            setCategoryState((prev) => ({
                              ...prev,
                              [category.eventCategoryId]: {
                                ...(prev[category.eventCategoryId] ?? state ?? DEFAULT_CATEGORY_FORM),
                                iconName: event.target.value,
                              },
                            }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                          label="Color"
                          placeholder="#FF5733"
                          value={state?.color ?? ''}
                          fullWidth
                          onChange={(event) =>
                            setCategoryState((prev) => ({
                              ...prev,
                              [category.eventCategoryId]: {
                                ...(prev[category.eventCategoryId] ?? state ?? DEFAULT_CATEGORY_FORM),
                                color: event.target.value,
                              },
                            }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Description"
                          value={state?.description ?? ''}
                          fullWidth
                          multiline
                          minRows={2}
                          onChange={(event) =>
                            setCategoryState((prev) => ({
                              ...prev,
                              [category.eventCategoryId]: {
                                ...(prev[category.eventCategoryId] ?? state ?? DEFAULT_CATEGORY_FORM),
                                description: event.target.value,
                              },
                            }))
                          }
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
