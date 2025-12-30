'use client';

import React from 'react';
import { Box, Typography, Slider, Paper, Stack } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useEventFilters } from './event-filter-context';

export default function PriceFilter() {
  const { filters, setPriceRange } = useEventFilters();

  const handlePriceChange = (event: Event, newValue: number | number[]) => {
    setPriceRange(newValue as [number, number]);
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
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <AttachMoneyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={600}>
          Price Range
        </Typography>
      </Stack>
      <Box px={1}>
        <Slider
          value={filters.priceRange}
          onChange={handlePriceChange}
          valueLabelDisplay="auto"
          min={0}
          max={500}
          marks={[
            { value: 0, label: '$0' },
            { value: 250, label: '$250' },
            { value: 500, label: '$500' },
          ]}
          sx={{
            '& .MuiSlider-thumb': {
              width: 20,
              height: 20,
            },
            '& .MuiSlider-track': {
              height: 6,
            },
            '& .MuiSlider-rail': {
              height: 6,
              opacity: 0.3,
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
          ${filters.priceRange[0]} - ${filters.priceRange[1]}
        </Typography>
      </Box>
    </Paper>
  );
}
