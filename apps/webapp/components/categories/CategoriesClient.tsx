'use client';

import { useMemo, useState } from 'react';
import { Box, Grid, Paper, Stack, Typography } from '@mui/material';
import { Category as CategoryIcon } from '@mui/icons-material';
import type { EventCategoryGroup } from '@/data/graphql/types/graphql';
import CategoryCard from '@/components/categories/CategoryCard';
import SearchBox from '@/components/search/SearchBox';

interface CategoriesClientProps {
  groups: EventCategoryGroup[];
}

export default function CategoriesClient({ groups }: CategoriesClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const searchItems = useMemo(
    () =>
      Array.from(
        new Set(
          groups.flatMap(
            (group) => [group.name, ...(group.eventCategories ?? []).map((c) => c.name)].filter(Boolean) as string[],
          ),
        ),
      ),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups
      .map((group) => {
        const groupNameMatch = (group.name ?? '').toLowerCase().includes(q);
        const matchingCategories = (group.eventCategories ?? []).filter((c) =>
          (c.name ?? '').toLowerCase().includes(q),
        );
        // Show the group if its name matches (with all categories) or if individual categories match
        if (groupNameMatch) return group;
        if (matchingCategories.length > 0) return { ...group, eventCategories: matchingCategories };
        return null;
      })
      .filter(Boolean) as EventCategoryGroup[];
  }, [groups, searchQuery]);

  return (
    <>
      <Box mb={5}>
        <SearchBox
          itemList={searchItems}
          placeholder="Try 'music', 'art', or 'wellness'"
          ariaLabel="Search categories"
          onSearch={setSearchQuery}
        />
      </Box>

      {filteredGroups.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CategoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
            {searchQuery ? 'No matching categories' : 'No categories available'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? 'Try a different search term.' : 'Check back soon!'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={6}>
          {filteredGroups.map((group) => (
            <Box key={group.slug}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems="baseline"
                spacing={1}
              >
                <Typography variant="h5" fontWeight={700}>
                  {group.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {group.eventCategories?.length ?? 0} categories
                </Typography>
              </Stack>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {(group.eventCategories ?? []).map((category) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.eventCategoryId}>
                    <CategoryCard category={category} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      )}
    </>
  );
}
