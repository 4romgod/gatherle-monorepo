'use client'

import React, { useState } from 'react';
import { Box, Typography, Slider, Paper } from '@mui/material';

export default function PriceFilter() {
  const [priceRange, setPriceRange] = useState<number>(50);

  const handlePriceChange = (event: Event, newValue: number | number[]) => {
    setPriceRange(newValue as number);
  };

  return (
    <Paper sx={{ backgroundColor: 'background.paper', p: 2 }}>
      <Box mb={2}>
        <Typography variant="body1" gutterBottom>
          Price Range
        </Typography>
        <Slider
          value={priceRange}
          onChange={handlePriceChange}
          valueLabelDisplay="auto"
          min={0}
          max={100}
        />
      </Box>
    </Paper>
  );
};
