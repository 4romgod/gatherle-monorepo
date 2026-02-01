'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  SelectChangeEvent,
  Paper,
  Stack,
  Checkbox,
  ListItemText,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import { CategoryFilterProps, getEventCategoryIcon } from '@/lib/constants';
import { useEventFilters } from '@/hooks/useEventFilters';

export default function CategoryFilter({ categoryList, sxProps, onChange, value = [] }: CategoryFilterProps) {
  const contextFilters = onChange ? null : useEventFilters();
  const [localCategories, setLocalCategories] = useState<string[]>(
    onChange ? value : (contextFilters?.filters.categories ?? []),
  );

  useEffect(() => {
    if (!onChange) {
      return;
    }

    setLocalCategories(value);
  }, [onChange, value]);

  const selectedCategories = onChange ? localCategories : contextFilters?.filters.categories || [];

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const selected = event.target.value as string[];

    if (onChange) {
      setLocalCategories(selected);
      onChange(selected);
    } else if (contextFilters) {
      contextFilters.setCategories(selected);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        ...sxProps,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <CategoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={600}>
          Categories
        </Typography>
      </Stack>
      <FormControl fullWidth size="small">
        <InputLabel id="category-label">Select Categories</InputLabel>
        <Select
          labelId="category-label"
          label="Select Categories"
          multiple
          value={selectedCategories}
          onChange={handleCategoryChange}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value: string) => (
                <Chip
                  key={value}
                  label={value}
                  size="small"
                  sx={{
                    borderRadius: 1.5,
                    fontWeight: 500,
                  }}
                />
              ))}
            </Box>
          )}
          sx={{
            borderRadius: 1.5,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
          }}
        >
          {categoryList.map((category) => {
            const IconComponent = getEventCategoryIcon(category.iconName);
            const isSelected = selectedCategories.includes(category.name);
            return (
              <MenuItem key={category.eventCategoryId} value={category.name}>
                <Checkbox checked={isSelected} size="small" />
                <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconComponent color={category.color || ''} height={20} width={20} />
                  <ListItemText primary={category.name} />
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Paper>
  );
}
