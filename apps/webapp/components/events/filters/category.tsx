'use client'

import React, { useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Chip, Typography, SelectChangeEvent } from '@mui/material';
import { CategoryFilterProps, getEventCategoryIcon } from '@/lib/constants';

export default function CategoryFilter({ categoryList, sxProps }: CategoryFilterProps) {
  const [categories, setCategories] = useState<string[]>([]);

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const selectedCategories = event.target.value as string[];
    setCategories(selectedCategories);
  };

  return (
    <FormControl fullWidth sx={{ ...sxProps }} size='small'>
      <InputLabel id="category-label">Categories</InputLabel>
      <Select
        labelId="category-label"
        multiple
        value={categories}
        onChange={handleCategoryChange}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip key={value} label={value} />
            ))}
          </Box>
        )}
        sx={{
          backgroundColor: 'background.paper'
        }}
      >
        {categoryList.map((category) => {
          const IconComponent = getEventCategoryIcon(category.iconName);
          return (
            <MenuItem key={category.eventCategoryId} value={category.name}>
              <Box
                component="div"
                sx={{
                  display: 'flex',
                  px: 2,
                }}
              >
                <IconComponent
                  color={category.color || ''}
                  height={24}
                  width={24}
                />
                <Typography variant='body1' pl={1}>{category.name}</Typography>
              </Box>
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  );
};
